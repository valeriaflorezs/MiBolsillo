import { describe, expect, it } from "vitest";
import { norm, parseCsv, parseMoney, toObjects } from "./csv";

describe("csv", () => {
  it("detecta ';' y respeta comillas", () => {
    const rows = parseCsv('Categoría;Descripción;Monto\nAirbnb;"Nevera; 470L";2.000.000\n');
    expect(rows).toEqual([["Categoría", "Descripción", "Monto"], ["Airbnb", "Nevera; 470L", "2.000.000"]]);
  });
  it("normaliza encabezados", () => {
    expect(toObjects(parseCsv("Categoría,Precio unitario real\nA,1")).at(0)).toEqual({ categoria: "A", precio_unitario_real: "1" });
    expect(norm("  Ropa de Cama y Cocina ")).toBe("ropa_de_cama_y_cocina");
  });
  it("interpreta montos en formatos es-CO y en-US", () => {
    expect(parseMoney("$ 1.200.000")).toBe(1200000);
    expect(parseMoney("1,200,000")).toBe(1200000);
    expect(parseMoney("75.900,50")).toBe(75900.5);
    expect(parseMoney("49950")).toBe(49950);
    expect(parseMoney("abc")).toBeNaN();
  });
});
