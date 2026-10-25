import type { OcrProvider } from "./types";

/** Selecciona proveedor por OCR_PROVIDER. Añadir uno nuevo = implementar OcrProvider. */
export async function getOcrProvider(): Promise<OcrProvider> {
  switch (process.env.OCR_PROVIDER ?? "claude") {
    case "claude":
      return (await import("./providers/claude")).claudeProvider;
    case "gemini":
      return (await import("./providers/gemini")).geminiProvider;
    default:
      throw new Error(`OCR_PROVIDER no soportado: ${process.env.OCR_PROVIDER}`);
  }
}
