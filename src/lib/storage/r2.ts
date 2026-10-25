import { S3Client, DeleteObjectsCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = Number(process.env.OCR_MAX_FILE_MB ?? 8) * 1024 * 1024;

let client: S3Client | undefined;
// Perezoso: importar este módulo sin variables R2 no debe fallar (el resto de la app sigue funcionando).
const getClient = () =>
  (client ??= new S3Client({
    region: "auto",
    // R2_ENDPOINT permite apuntar a otro servicio compatible con S3 (pruebas locales, MinIO).
    endpoint: process.env.R2_ENDPOINT ?? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: Boolean(process.env.R2_ENDPOINT),
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "" },
  }));
const Bucket = () => process.env.R2_BUCKET ?? "";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf",
};

/** El navegador sube DIRECTO a R2 con este PUT firmado (la clave siempre queda bajo ws/{workspaceId}/). */
export async function createReceiptUpload(workspaceId: string, mimeType: string, sizeBytes: number) {
  if (!ALLOWED.has(mimeType)) throw new Error("Tipo de archivo no permitido");
  if (sizeBytes > MAX_BYTES) throw new Error("Archivo demasiado grande");

  const d = new Date();
  const key = `ws/${workspaceId}/receipts/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${EXT[mimeType]}`;
  const url = await getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: Bucket(), Key: key, ContentType: mimeType, ContentLength: sizeBytes }),
    { expiresIn: 300 },
  );
  return { key, url };
}

/** Lectura: URL firmada de corta vida (bucket privado). */
export const signedReadUrl = (key: string) =>
  getSignedUrl(getClient(), new GetObjectCommand({ Bucket: Bucket(), Key: key }), { expiresIn: 600 });

export async function readObject(key: string): Promise<Uint8Array> {
  const out = await getClient().send(new GetObjectCommand({ Bucket: Bucket(), Key: key }));
  return out.Body!.transformToByteArray();
}

/** Borra objetos de R2 (lotes de 1000). Usado al eliminar un negocio y al limpiar subidas huérfanas. */
export async function deleteObjects(keys: string[]) {
  for (let i = 0; i < keys.length; i += 1000) {
    await getClient().send(new DeleteObjectsCommand({ Bucket: Bucket(), Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true } }));
  }
}
