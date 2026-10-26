// Saldo por cuenta = saldo inicial + ingresos pagados − gastos pagados + transferencias recibidas − enviadas.
// Los movimientos pendientes no mueven el saldo (se informan aparte). Pura y testeable.
export type BalanceAccount<T = unknown> = { id: string; openingBalance: number } & T;
export type BalanceTx = { type: "INCOME" | "EXPENSE" | "TRANSFER"; status: "PAID" | "PENDING"; amount: number; accountId: string; transferAccountId: string | null };

export function balancesFrom<T extends { id: string; openingBalance: number }>(accounts: T[], tx: BalanceTx[]) {
  const parts = new Map(accounts.map((a) => [a.id, { income: 0, expense: 0, transferIn: 0, transferOut: 0, pendingCount: 0, pendingNet: 0 }]));
  for (const t of tx) {
    const src = parts.get(t.accountId), dst = t.transferAccountId ? parts.get(t.transferAccountId) : undefined;
    if (t.status === "PENDING") {
      if (src) { src.pendingCount++; src.pendingNet += t.type === "INCOME" ? t.amount : -t.amount; }
      continue;
    }
    if (t.type === "INCOME") { if (src) src.income += t.amount; }
    else if (t.type === "EXPENSE") { if (src) src.expense += t.amount; }
    else { if (src) src.transferOut += t.amount; if (dst) dst.transferIn += t.amount; }
  }
  return accounts.map((a) => {
    const p = parts.get(a.id)!;
    return { ...a, ...p, balance: a.openingBalance + p.income - p.expense + p.transferIn - p.transferOut };
  });
}
