import { ReceiptExtractionSchema, type OcrProvider } from "../types";

// Gemini vía REST (sin SDK). La clave va en GEMINI_API_KEY (variable de Railway), nunca en el código.
const BASE = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com";
const nullable = (type: string, description?: string) => ({ type, nullable: true, ...(description ? { description } : {}) });

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    vendor: nullable("string"),
    date: nullable("string", "yyyy-mm-dd"),
    total: nullable("number", "Total pagado, sin separadores de miles"),
    currency: nullable("string"),
    taxAmount: nullable("number"),
    suggestedCategory: nullable("string"),
    confidence: { type: "number" },
  },
  required: ["vendor", "date", "total", "currency", "taxAmount", "suggestedCategory", "confidence"],
};

export const geminiProvider: OcrProvider = {
  name: "gemini",
  async extract({ bytes, mimeType, categoryNames }) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY no configurada");
    const model = process.env.OCR_MODEL ?? "gemini-flash-latest";
    const res = await fetch(`${BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": key },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text:
              "Extraes datos de facturas y recibos colombianos (pesos COP por defecto). " +
              "vendor: nombre del comercio. date: fecha de emisión en yyyy-mm-dd (en Colombia se escribe día/mes/año). " +
              "total: el TOTAL A PAGAR final como número sin separadores (en Colombia el punto separa miles: 1.250.000 → 1250000). " +
              "taxAmount: IVA o impuesto si aparece. currency: código ISO (COP si no se indica). " +
              `suggestedCategory: exactamente una de [${categoryNames.join(", ") || "ninguna"}] o null si ninguna encaja. ` +
              "confidence: tu confianza global de 0 a 1. Usa null para lo que no sea legible; no inventes valores.",
          }],
        },
        contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: Buffer.from(bytes).toString("base64") } }, { text: "Extrae los datos de este comprobante." }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, temperature: 0 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`); // el cuerpo puede contener datos del usuario: no se registra
    const json = (await res.json()) as { candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[] };
    const cand = json.candidates?.[0];
    const text = cand?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text) throw new Error(`Gemini sin resultado (${cand?.finishReason ?? "sin candidatos"})`);
    return { data: ReceiptExtractionSchema.parse(JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1))), raw: { provider: "gemini", model, finishReason: cand?.finishReason, text } };
  },
};
