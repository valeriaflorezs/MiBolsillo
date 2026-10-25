import { describe, expect, it } from "vitest";
import { inferCapexCategory, parseCapex, parseDate, parseTransactions } from "./import";

describe("parsers de carga en lote", () => {
  it("parsea fechas día-primero y rechaza fechas imposibles", () => {
    expect(parseDate("15/03/2026")?.toISOString()).toBe("2026-03-15T00:00:00.000Z");
    expect(parseDate("2026-3-5")?.toISOString()).toBe("2026-03-05T00:00:00.000Z");
    expect(parseDate("31/02/2026")).toBeNull();
    expect(parseDate("hoy")).toBeNull();
  });

  it("deduce la categoría de CAPEX por el nombre del ítem", () => {
    expect(inferCapexCategory("Nevera 470L")).toBe("APPLIANCES");
    expect(inferCapexCategory("Colchon de 1.60")).toBe("FURNITURE");
    expect(inferCapexCategory("Set de Toallas")).toBe("LINENS_KITCHENWARE");
    expect(inferCapexCategory("Grifo de Regadera")).toBe("RENOVATION");
    expect(inferCapexCategory("Cosa rara")).toBeUndefined();
  });

  it("CAPEX en modo permisivo usa la categoría deducida y avisa; en modo estricto da error", () => {
    const o = [{ categoria: "Airbnb", descripcion: "Nevera 305L", cantidad: "1", precio_unitario_presupuestado: "1.400.000", precio_unitario_real: "1580940" }];
    const lax = parseCapex(o, new Set(), { lenientCategory: true });
    expect(lax.errors).toEqual([]);
    expect(lax.warnings).toHaveLength(1);
    expect(lax.data[0]).toMatchObject({ capexCategory: "APPLIANCES", status: "PURCHASED", quantity: 1 });
    expect(parseCapex(o, new Set()).errors).toHaveLength(1);
  });

  it("movimientos: resuelve cuenta y categoría por nombre, y reporta cada fila mala con su índice", () => {
    const lk = { accounts: [{ id: "a1", name: "Bancolombia" }, { id: "a2", name: "Nequi" }], categories: [{ id: "c1", name: "🔧 Mantenimiento" }] };
    const p = parseTransactions([
      { fecha: "05/03/2026", tipo: "Gasto", monto: "$ 120.000", proveedor: "Ferretería", categoria: "Mantenimiento", cuenta: "nequi", estado: "Pendiente" },
      { fecha: "2026-03-06", tipo: "Ingreso", monto: "900000", cuenta: "Bancolombia" },
      { fecha: "2026-03-07", tipo: "Gasto", monto: "-5", cuenta: "Nequi" },
      { fecha: "2026-03-07", tipo: "Gasto", monto: "5", cuenta: "Otra" },
      { fecha: "2026-03-07", tipo: "Gasto", monto: "5", cuenta: "Nequi", categoria: "Inexistente" },
    ], lk);
    expect(p.data).toHaveLength(2);
    expect(p.data[0]).toMatchObject({ type: "EXPENSE", status: "PENDING", amount: 120000, accountId: "a2", categoryId: "c1" });
    expect(p.data[1]).toMatchObject({ type: "INCOME", status: "PAID", categoryId: null });
    expect(p.errors.map((e) => e.row)).toEqual([2, 3, 4]);
    // con una sola cuenta, la cuenta es opcional
    expect(parseTransactions([{ fecha: "2026-03-07", monto: "5" }], { accounts: [{ id: "a1", name: "Efectivo" }], categories: [] }).data[0].accountId).toBe("a1");
  });
});
