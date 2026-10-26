import { describe, expect, it } from "vitest";
import { categoryFilter, parseExclusion } from "./queries";

const A = "cmvoj6laz0000lu7d2d1a5vh0", B = "cmvoj6lbo0001lu7dp7kyncsn";

describe("filtro de categorías de los resúmenes", () => {
  it("parsea ids válidos y 'none', descarta basura y duplicados", () => {
    expect(parseExclusion(`${A},${B},none,${A}`)).toEqual([A, B, "none"]);
    expect(parseExclusion("x,';drop table,123, ,")).toEqual([]);
    expect(parseExclusion(undefined)).toEqual([]);
    expect(parseExclusion(Array.from({ length: 300 }, (_, i) => `c${String(i).padStart(24, "0")}`).join(",")).length).toBe(200);
  });

  it("sin exclusiones no filtra", () => {
    expect(categoryFilter(undefined)).toEqual({});
    expect(categoryFilter([])).toEqual({});
  });

  it("excluir categorías conserva los movimientos sin categoría", () => {
    expect(categoryFilter([A, B])).toEqual({ OR: [{ categoryId: null }, { categoryId: { notIn: [A, B] } }] });
  });

  it("excluir 'none' quita los sin categoría", () => {
    expect(categoryFilter(["none"])).toEqual({ categoryId: { not: null } });
    expect(categoryFilter([A, "none"])).toEqual({ categoryId: { notIn: [A], not: null } });
  });
});
