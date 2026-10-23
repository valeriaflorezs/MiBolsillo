import { z } from "zod";

export const ReceiptExtractionSchema = z.object({
  vendor: z.string().nullable(),
  date: z.string().nullable().describe("ISO yyyy-mm-dd"),
  total: z.number().nullable().describe("Total pagado, en la moneda del documento, sin separadores"),
  currency: z.string().nullable(),
  taxAmount: z.number().nullable(),
  suggestedCategory: z.string().nullable().describe("Una de las categorías del workspace, o null"),
  confidence: z.number().min(0).max(1),
});
export type ReceiptExtraction = z.infer<typeof ReceiptExtractionSchema>;

export interface OcrInput {
  bytes: Uint8Array;
  mimeType: string; // image/jpeg | image/png | image/webp | application/pdf
  categoryNames: string[]; // para sugerir categoría
}

export interface OcrProvider {
  readonly name: string;
  extract(input: OcrInput): Promise<{ data: ReceiptExtraction; raw: unknown }>;
}
