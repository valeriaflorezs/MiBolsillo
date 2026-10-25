/** Qué partes del flujo de comprobantes están configuradas (solo lee variables; nunca las expone). */
export function receiptCapabilities() {
  const upload = Boolean(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET && (process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID));
  const ocr = upload && Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  return { upload, ocr };
}
