import { describe, expect, it } from "vitest";
import { balancesFrom, type BalanceTx } from "./balances";

const A = { id: "a", openingBalance: 1000 }, B = { id: "b", openingBalance: 0 };
const tx = (o: Partial<BalanceTx> & Pick<BalanceTx, "type" | "amount" | "accountId">): BalanceTx => ({ status: "PAID", transferAccountId: null, ...o });

describe("saldo por cuenta", () => {
  it("saldo inicial + ingresos − gastos", () => {
    const [a] = balancesFrom([A], [tx({ type: "INCOME", amount: 500, accountId: "a" }), tx({ type: "EXPENSE", amount: 200, accountId: "a" })]);
    expect(a.balance).toBe(1300);
    expect([a.income, a.expense]).toEqual([500, 200]);
  });

  it("la transferencia resta del origen y suma al destino, y el total no cambia", () => {
    const r = balancesFrom([A, B], [tx({ type: "TRANSFER", amount: 300, accountId: "a", transferAccountId: "b" })]);
    expect(r.map((x) => x.balance)).toEqual([700, 300]);
    expect(r[0].balance + r[1].balance).toBe(1000);
  });

  it("los pendientes no mueven el saldo pero se cuentan aparte", () => {
    const [a] = balancesFrom([A], [tx({ type: "EXPENSE", amount: 400, accountId: "a", status: "PENDING" }), tx({ type: "INCOME", amount: 100, accountId: "a", status: "PENDING" })]);
    expect(a.balance).toBe(1000);
    expect([a.pendingCount, a.pendingNet]).toEqual([2, -300]);
  });

  it("ignora movimientos de cuentas que no están en la lista (archivadas)", () => {
    const [a] = balancesFrom([A], [tx({ type: "TRANSFER", amount: 50, accountId: "x", transferAccountId: "a" })]);
    expect(a.balance).toBe(1050);
  });
});
