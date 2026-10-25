import { describe, expect, it } from "vitest";
import { cellText, mapSheet, parseClipboard } from "./spec";

describe("carga en lote", () => {
  it("parsea el pegado de Excel (TSV, comillas con saltos de línea, vacíos al final)", () => {
    expect(parseClipboard("a\tb\n1\t\"x\ny\"\n")).toEqual([["a", "b"], ["1", "x y"]]);
    expect(parseClipboard("")).toEqual([]);
  });

  it("convierte celdas de Excel: fechas, decimales y vacíos", () => {
    expect(cellText(new Date(Date.UTC(2026, 2, 5)))).toBe("2026-03-05");
    expect(cellText(1.234)).toBe("1.23"); // 3 decimales no se confunden con miles
    expect(cellText(null)).toBe("");
    expect(cellText("  hola   mundo ")).toBe("hola mundo");
  });

  it("mapea la hoja «Presupuesto Inversión» del Excel del proyecto a las columnas de CAPEX", () => {
    const data = [
      ["Categoría", "Ítem / Descripción", "Cantidad", "Presupuesto Asignado por Unidad", "Presupuesto Asignado Total", "Gasto Real por Unidad", "Gasto Real Total", "Diferencia", "Estado"],
      ["Airbnb", "Nevera 470L", 1, 2000000, 2000000, 2042235, 2042235, -42235, "Pendiente"],
      [null, null, null, null, null, null, null, null, null],
      ["Airbnb", "Cama de 1.40", 2, 600000, 1200000, null, 0, 1200000, "Pendiente"],
    ];
    const m = mapSheet("capex", data)!;
    expect(m.missing).toEqual(["Tienda"]);
    expect(m.rows).toEqual([["Airbnb", "Nevera 470L", "1", "2000000", "2042235", ""], ["Airbnb", "Cama de 1.40", "2", "600000", "", ""]]);
  });

  it("encuentra el encabezado aunque haya filas de título arriba y rechaza hojas sin encabezados", () => {
    const m = mapSheet("fixed", [["Gastos del apto"], [], ["Nombre", "Monto"], ["Netflix", 50900]])!;
    expect(m.headerRow).toBe(2);
    expect(m.rows).toEqual([["Netflix", "", "50900", "", ""]]);
    expect(mapSheet("fixed", [["x", "y"], [1, 2]])).toBeNull();
  });
});
