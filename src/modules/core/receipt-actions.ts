"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/permissions";
import { rateLimit } from "@/lib/security/rate-limit";
import { createReceiptUpload, signedReadUrl } from "@/lib/storage/r2";

const UploadInput = z.object({
  workspaceId: z.string().cuid(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  sizeBytes: z.number().int().positive(),
  fileName: z.string().max(200).optional(),
});

/** Paso 1 del flujo OCR: valida, limita y devuelve una URL prefirmada de subida. */
export async function createReceiptUploadAction(raw: unknown) {
  const input = UploadInput.parse(raw);
  const { userId } = await requireWorkspace(input.workspaceId, "transaction:create");
  rateLimit(`upload:${userId}`, 30, 60_000);

  const { key, url } = await createReceiptUpload(input.workspaceId, input.mimeType, input.sizeBytes);
  const attachment = await prisma.attachment.create({
    data: {
      workspaceId: input.workspaceId,
      uploadedById: userId,
      storageKey: key,
      fileType: input.mimeType,
      fileName: input.fileName,
      sizeBytes: input.sizeBytes,
    },
    select: { id: true },
  });
  return { attachmentId: attachment.id, uploadUrl: url };
}

/** URL de lectura firmada, solo si el adjunto pertenece a un workspace del usuario (anti-IDOR). */
export async function getReceiptUrlAction(raw: unknown) {
  const { workspaceId, attachmentId } = z
    .object({ workspaceId: z.string().cuid(), attachmentId: z.string().cuid() })
    .parse(raw);
  await requireWorkspace(workspaceId, "transaction:create");

  const att = await prisma.attachment.findFirst({
    where: { id: attachmentId, workspaceId }, // el filtro por workspace es la barrera
    select: { storageKey: true },
  });
  if (!att) throw new Error("NOT_FOUND");
  return { url: await signedReadUrl(att.storageKey) };
}
