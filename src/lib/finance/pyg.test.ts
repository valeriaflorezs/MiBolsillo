import { describe, expect, it } from "vitest";
import { buildPyg, capexVariance } from "./pyg";

describe("buildPyg", () => {
  const reservations = [
    { grossAmount: 1_000_000, cleaningFeeCharged: 80_000, platformCommission: 150_000 },
  ];
  const expenses = [
    { pygLine: "CLEANING" as const, amount: 80_000 },
    { pygLine: "AMENITIES" as const, amount: 20_000 },
    { pygLine: "ADMIN" as const, amount: 300_000 },
    { pygLine: "UTILITIES" as const, amount: 100_000 },
    { pygLine: "CAPEX" as const, amount: 5_000_000 },
  ];

  it("calcula margen de contribución y EBITDA, dejando CAPEX fuera", () => {
    const pyg = buildPyg(reservations, expenses);
    expect(pyg.grossRevenue).toBe(1_080_000);
    expect(pyg.variableCosts.total).toBe(250_000);
    expect(pyg.contributionMargin).toBe(830_000);
    expect(pyg.fixedOpex.total).toBe(400_000);
    expect(pyg.ebitda).toBe(430_000);
    expect(pyg.capex).toBe(5_000_000);
  });

  it("no divide por cero sin ingresos", () => {
    expect(buildPyg([], []).ebitdaPct).toBe(0);
  });
});

describe("capexVariance", () => {
  it("positivo = ahorro", () => {
    expect(capexVariance({ quantity: 2, budgetedUnitPrice: 500, actualUnitPrice: 400 }).variance).toBe(200);
  });
  it("sin precio real no hay variación", () => {
    expect(capexVariance({ quantity: 1, budgetedUnitPrice: 500, actualUnitPrice: null }).variance).toBeNull();
  });
});
