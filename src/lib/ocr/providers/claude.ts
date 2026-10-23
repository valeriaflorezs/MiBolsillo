import Anthropic from "@anthropic-ai/sdk";
import { ReceiptExtractionSchema, type OcrProvider } from "../types";

// Esqueleto: valida la forma exacta de los bloques image/document contra la versión instalada del SDK.
const client = new Anthropic(); // ANTHROPIC_API_KEY

export const claudeProvider: OcrProvider = {
  name: "claude",
  async extract({ bytes, mimeType, categoryNames }) {
    const data = Buffer.from(bytes).toString("base64");
    const source =
      mimeType === "application/pdf"
        ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data } } as const)
        : ({ type: "image", source: { type: "base64", media_type: mimeType as "image/jpeg", data } } as const);

    const res = await client.messages.create({
      model: process.env.OCR_MODEL ?? "claude-haiku-5-5",
      max_tokens: 600,
      system:
        "Extrae datos de facturas/recibos colombianos. Responde SOLO un JSON con las claves: " +
        "vendor, date (yyyy-mm-dd), total (número sin separadores de miles), currency, taxAmount, " +
        `suggestedCategory (una de: ${categoryNames.join(", ") || "ninguna"} o null), confidence (0-1). ` +
        "Usa null si un dato no es legible. No inventes valores.",
      messages: [{ role: "user", content: [source, { type: "text", text: "Extrae los datos." }] }],
    });

    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return { data: ReceiptExtractionSchema.parse(json), raw: res };
  },
};
