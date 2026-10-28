import { describe, expect, it } from "vitest";
import { categoryIconKey } from "@/components/ui/icons";
import { DEFAULT_CATEGORIES, FINANCIAL_CATEGORIES } from "@/modules/core/defaults";

describe("iconos de categorías", () => {
  it("traduce los emojis antiguos y tolera vacíos o desconocidos", () => {
    expect(categoryIconKey("🧹")).toBe("cleaning");
    expect(categoryIconKey("🛏️")).toBe("hotel");
    expect(categoryIconKey("⚖️")).toBe("balance");
    expect(categoryIconKey("bulb")).toBe("bulb");
    expect(categoryIconKey("🦄")).toBe("category");
    expect(categoryIconKey(null)).toBe("category");
  });
  it("las categorías por defecto usan nombres de icono reales", () => {
    for (const c of [...Object.values(DEFAULT_CATEGORIES).flat(), ...FINANCIAL_CATEGORIES]) expect(categoryIconKey(c.emoji), c.name).toBe(c.emoji);
  });
});
