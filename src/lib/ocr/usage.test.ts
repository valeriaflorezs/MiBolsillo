import { describe, expect, it } from "vitest";
import { ocrUsage } from "./usage";

describe("ocrUsage", () => {
  it("lee los tokens de Claude", () => {
    expect(ocrUsage({ model: "claude-haiku-5-5", usage: { input_tokens: 1200, output_tokens: 90 } })).toEqual({ inputTokens: 1200, outputTokens: 90, model: "claude-haiku-5-5" });
  });
  it("lee los tokens de Gemini", () => {
    expect(ocrUsage({ modelVersion: "gemini-x", usageMetadata: { promptTokenCount: 800, candidatesTokenCount: 40 } })).toEqual({ inputTokens: 800, outputTokens: 40, model: "gemini-x" });
  });
  it("tolera respuestas sin uso", () => {
    expect(ocrUsage(null)).toEqual({ inputTokens: 0, outputTokens: 0, model: null });
  });
});
