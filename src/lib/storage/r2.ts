import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = Number(process.env.OCR_MAX_FILE_MB ?? 8) * 1024 * 1024;

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const Bucket = process.env.R2_BUCKET!;

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
    r2,
    new PutObjectCommand({ Bucket, Key: key, ContentType: mimeType, ContentLength: sizeBytes }),
    { expiresIn: 300 },
  );
  return { key, url };
}

/** Lectura: URL firmada de corta vida (bucket privado). */
export const signedReadUrl = (key: string) =>
  getSignedUrl(r2, new GetObjectCommand({ Bucket, Key: key }), { expiresIn: 600 });

export async function readObject(key: string): Promise<Uint8Array> {
  const out = await r2.send(new GetObjectCommand({ Bucket, Key: key }));
  return out.Body!.transformToByteArray();
}
