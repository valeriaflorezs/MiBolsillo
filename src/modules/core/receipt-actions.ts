"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { can, requireWorkspace } from "@/lib/auth/permissions";
import { rateLimit } from "@/lib/security/rate-limit";
import { getOcrProvider } from "@/lib/ocr";
import { ocrUsage } from "@/lib/ocr/usage";
import { logActivity } from "@/lib/audit";
import { receiptCapabilities } from "@/lib/ocr/config";
import { createReceiptUpload, deleteObjects, readObject, signedReadUrl } from "@/lib/storage/r2";

const UploadInput = z.object({
  workspaceId: z.string().cuid(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  sizeBytes: z.number().int().positive(),
  fileName: z.string().max(200).optional(),
});

const startsWith = (b: Uint8Array, sig: number[]) => sig.every((x, i) => b[i] === x);
/** Verifica el tipo REAL por magic bytes (no confiar en el MIME que declara el navegador). */
function realMime(b: Uint8Array): string | null {
  if (startsWith(b, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWith(b, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  if (startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b.subarray(8), [0x57, 0x45, 0x42, 0x50])) return "image/webp";
  return null;
}

/** Paso 1: valida, limita y devuelve una URL prefirmada de subida directa a R2. */
export async function createReceiptUploadAction(raw: unknown) {
  try {
    const input = UploadInput.parse(raw);
    if (!receiptCapabilities().upload) return { ok: false as const, error: "El almacenamiento de comprobantes aún no está configurado." };
    const { userId } = await requireWorkspace(input.workspaceId, "transaction:create");
    rateLimit(`upload:${userId}`, 30, 60_000);
    await purgeOrphans(userId);
    const { key, url } = await createReceiptUpload(input.workspaceId, input.mimeType, input.sizeBytes);
    const att = await prisma.attachment.create({
      data: { workspaceId: input.workspaceId, uploadedById: userId, storageKey: key, fileType: input.mimeType, fileName: input.fileName, sizeBytes: input.sizeBytes },
      select: { id: true },
    });
    return { ok: true as const, attachmentId: att.id, uploadUrl: url };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error && /no permitido|grande/.test(e.message) ? e.message : "No se pudo preparar la subida." };
  }
}

/** Paso 2: lee el archivo, verifica su tipo real y extrae datos con OCR. Siempre hay fallback manual. */
export async function processReceiptAction(raw: unknown) {
  try {
    const { workspaceId, attachmentId } = z.object({ workspaceId: z.string().cuid(), attachmentId: z.string().cuid() }).parse(raw);
    const { userId } = await requireWorkspace(workspaceId, "transaction:create");
    rateLimit(`ocr:${userId}`, 15, 60_000);
    const att = await prisma.attachment.findFirst({ where: { id: attachmentId, workspaceId, uploadedById: userId } });
    if (!att) return { ok: false as const, error: "Comprobante no encontrado." };
    if (!receiptCapabilities().ocr) return { ok: false as const, error: "El comprobante quedó guardado. La lectura automática aún no está activada: completa los datos a mano." };

    const bytes = await readObject(att.storageKey);
    const mime = realMime(bytes);
    if (!mime) {
      await prisma.attachment.update({ where: { id: att.id }, data: { ocrStatus: "FAILED" } });
      return { ok: false as const, error: "El archivo no es una imagen ni un PDF válido." };
    }
    const categories = await prisma.category.findMany({ where: { workspaceId, archived: false, expenseKind: { not: null } }, select: { id: true, name: true } });
    await prisma.attachment.update({ where: { id: att.id }, data: { ocrStatus: "PROCESSING", fileType: mime } });
    let providerName = process.env.OCR_PROVIDER ?? "claude";
    try {
      const provider = await getOcrProvider();
      providerName = provider.name;
      const { data, raw: rawOcr } = await provider.extract({ bytes, mimeType: mime, categoryNames: categories.map((c) => c.name) });
      await prisma.aiUsage.create({ data: { userId, workspaceId, provider: provider.name, ...ocrUsage(rawOcr) } }).catch(() => {});
      await logActivity({ kind: "AI", userId, workspaceId, summary: "Analizó un comprobante con IA", detail: `Proveedor: ${provider.name}` });
      await prisma.attachment.update({
        where: { id: att.id },
        data: { ocrStatus: "DONE", ocrProvider: provider.name, ocrConfidence: data.confidence, rawOcrData: JSON.parse(JSON.stringify(rawOcr)) },
      });
      const cat = categories.find((c) => c.name.toLowerCase() === data.suggestedCategory?.toLowerCase());
      return { ok: true as const, data: { vendor: data.vendor, date: data.date, total: data.total, categoryId: cat?.id ?? null, confidence: data.confidence } };
    } catch (e) {
      await prisma.aiUsage.create({ data: { userId, workspaceId, provider: providerName, ok: false, error: (e instanceof Error ? e.message : "ERROR").slice(0, 200) } }).catch(() => {});
      await logActivity({ kind: "AI", ok: false, userId, workspaceId, summary: "Falló el análisis de un comprobante con IA", detail: providerName });
      await prisma.attachment.update({ where: { id: att.id }, data: { ocrStatus: "FAILED" } });
      return { ok: false as const, error: "No pudimos leer el comprobante. Completa los datos a mano." };
    }
  } catch {
    return { ok: false as const, error: "No se pudo procesar el comprobante." };
  }
}

/** URL de lectura firmada, solo si el adjunto pertenece al workspace del usuario (anti-IDOR). */
export async function getReceiptUrlAction(raw: unknown) {
  const { workspaceId, attachmentId } = z.object({ workspaceId: z.string().cuid(), attachmentId: z.string().cuid() }).parse(raw);
  const { userId, role } = await requireWorkspace(workspaceId, "data:read");
  // El OPERATOR solo accede a los comprobantes que él subió.
  const att = await prisma.attachment.findFirst({ where: { id: attachmentId, workspaceId, ...(can(role, "finance:read") ? {} : { uploadedById: userId }) }, select: { storageKey: true } });
  if (!att) throw new Error("NOT_FOUND");
  return { url: await signedReadUrl(att.storageKey) };
}

/** Limpieza oportunista: borra comprobantes subidos por el usuario hace >24 h que nunca se asociaron a un gasto. */
async function purgeOrphans(userId: string) {
  try {
    const old = await prisma.attachment.findMany({
      where: { uploadedById: userId, transactionId: null, createdAt: { lt: new Date(Date.now() - 86_400_000) } },
      select: { id: true, storageKey: true },
      take: 50,
    });
    if (!old.length) return;
    await deleteObjects(old.map((a) => a.storageKey));
    await prisma.attachment.deleteMany({ where: { id: { in: old.map((a) => a.id) } } });
  } catch (e) {
    console.error("purgeOrphans", e);
  }
}
