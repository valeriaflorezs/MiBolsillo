import Anthropic from "@anthropic-ai/sdk";
import { ReceiptExtractionSchema, type OcrProvider } from "../types";

// Perezoso: el cliente se crea al primer uso (sin ANTHROPIC_API_KEY el resto de la app no se ve afectado).
let client: Anthropic | undefined;

// Esquema de salida estructurada: la API garantiza JSON con esta forma.
const nullable = (t: "string" | "number", description?: string) => ({ anyOf: [{ type: t }, { type: "null" }], ...(description ? { description } : {}) });
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["vendor", "date", "total", "currency", "taxAmount", "suggestedCategory", "confidence"],
  properties: {
    vendor: nullable("string"),
    date: nullable("string", "yyyy-mm-dd"),
    total: nullable("number", "Total pagado, sin separadores de miles"),
    currency: nullable("string"),
    taxAmount: nullable("number"),
    suggestedCategory: nullable("string"),
    confidence: { type: "number" },
  },
} as const;

export const claudeProvider: OcrProvider = {
  name: "claude",
  async extract({ bytes, mimeType, categoryNames }) {
    client ??= new Anthropic(); // ANTHROPIC_API_KEY
    const data = Buffer.from(bytes).toString("base64");
    const source =
      mimeType === "application/pdf"
        ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data } } as const)
        : ({ type: "image", source: { type: "base64", media_type: mimeType as "image/jpeg", data } } as const);

    const request = {
      model: process.env.OCR_MODEL ?? "claude-haiku-5-5",
      max_tokens: 4000,
      system:
        "Extraes datos de facturas y recibos colombianos (pesos COP por defecto). " +
        "vendor: nombre del comercio. date: fecha de emisión en yyyy-mm-dd (en Colombia se escribe día/mes/año). " +
        "total: el TOTAL A PAGAR final como número sin separadores (en Colombia el punto separa miles: 1.250.000 → 1250000). " +
        "taxAmount: IVA o impuesto si aparece. currency: código ISO (COP si no se indica). " +
        `suggestedCategory: exactamente una de [${categoryNames.join(", ") || "ninguna"}] o null si ninguna encaja. ` +
        "confidence: tu confianza global de 0 a 1. Usa null para lo que no sea legible; no inventes valores.",
      messages: [{ role: "user" as const, content: [source, { type: "text" as const, text: "Extrae los datos de este comprobante." }] }],
    };
    // Salida estructurada (JSON garantizado); si la API rechazara el esquema, se reintenta pidiendo JSON en texto.
    const res = await client.messages
      .create({ ...request, output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } } })
      .catch((e: unknown) => {
        if (e instanceof Anthropic.BadRequestError) return client!.messages.create({ ...request, output_config: { effort: "low" }, system: `${request.system} Responde SOLO un objeto JSON con las claves: vendor, date, total, currency, taxAmount, suggestedCategory, confidence.` });
        throw e;
      });

    if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") throw new Error(`OCR sin resultado (${res.stop_reason})`);
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    return { data: ReceiptExtractionSchema.parse(JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1))), raw: res };
  },
};
