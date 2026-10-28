/** Tokens y modelo que reporta la respuesta cruda del proveedor de OCR (Claude o Gemini). */
export function ocrUsage(raw: unknown) {
  const r = (raw ?? {}) as { usage?: { input_tokens?: number; output_tokens?: number }; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }; model?: string; modelVersion?: string };
  return {
    inputTokens: Math.max(0, Math.round(r.usage?.input_tokens ?? r.usageMetadata?.promptTokenCount ?? 0)),
    outputTokens: Math.max(0, Math.round(r.usage?.output_tokens ?? r.usageMetadata?.candidatesTokenCount ?? 0)),
    model: r.model ?? r.modelVersion ?? null,
  };
}
