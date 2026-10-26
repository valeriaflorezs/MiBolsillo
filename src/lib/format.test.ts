import { describe, expect, it } from "vitest";
import { txTitle, txVendorHint } from "./format";

describe("título de movimiento", () => {
  it("usa la nota primero y deja el proveedor como pista", () => {
    const t = { description: "Toallas de baño", vendor: "Alkosto" };
    expect(txTitle(t, "Gasto")).toBe("Toallas de baño");
    expect(txVendorHint(t)).toBe("Alkosto");
  });
  it("sin nota usa el proveedor, luego la categoría, luego el texto por defecto", () => {
    expect(txTitle({ description: "  ", vendor: "Alkosto" }, "Gasto")).toBe("Alkosto");
    expect(txVendorHint({ description: null, vendor: "Alkosto" })).toBeNull();
    expect(txTitle({}, "Gasto", "Aseo")).toBe("Aseo");
    expect(txTitle({}, "Gasto")).toBe("Gasto");
  });
});
