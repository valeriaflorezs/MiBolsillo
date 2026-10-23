import { prisma } from "@/lib/db";
import { buildPyg, type PygExpenseRow } from "@/lib/finance/pyg";
import { num, shiftMonth } from "@/lib/format";
import type { TransactionStatus } from "@/generated/prisma/client";

export type StatusFilter = TransactionStatus | undefined; // undefined = todo (devengo)
export const parseStatus = (s?: string): StatusFilter => (s === "PENDING" ? "PENDING" : s === "ALL" ? undefined : "PAID");

const payout = (s: StatusFilter) => (s === "PAID" ? { payoutStatus: "RECEIVED" as const } : s === "PENDING" ? { payoutStatus: "PENDING" as const } : {});

/** Resumen de un rango: ingresos, gastos por línea de PyG, flujo de caja y estado de resultados. */
export async function periodSummary(workspaceId: string, start: Date, end: Date, status: StatusFilter) {
  const [reservations, incomeTx, expenseTx] = await Promise.all([
    prisma.reservation.findMany({
      where: { workspaceId, status: { not: "CANCELLED" }, checkIn: { gte: start, lt: end }, ...payout(status) },
      select: { grossAmount: true, cleaningFeeCharged: true, platformCommission: true },
    }),
    prisma.transaction.aggregate({
      where: { workspaceId, type: "INCOME", date: { gte: start, lt: end }, ...(status ? { status } : {}) },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { workspaceId, type: "EXPENSE", date: { gte: start, lt: end }, ...(status ? { status } : {}) },
      select: { amount: true, categoryId: true, category: { select: { pygLine: true } } },
    }),
  ]);
  const res = reservations.map((r) => ({ grossAmount: num(r.grossAmount), cleaningFeeCharged: num(r.cleaningFeeCharged), platformCommission: num(r.platformCommission) }));
  const expenses: PygExpenseRow[] = expenseTx.map((t) => ({ pygLine: t.category?.pygLine ?? "OTHER_VARIABLE", amount: num(t.amount) }));
  const otherRevenue = num(incomeTx._sum.amount);
  const pyg = buildPyg(res, expenses, otherRevenue);
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0) + res.reduce((a, r) => a + r.platformCommission, 0);
  return { pyg, cashFlow: pyg.grossRevenue - totalExpenses, expenseByCategory: expenseTx };
}

export async function budgetExecution(workspaceId: string, month: string, start: Date, end: Date) {
  const budgets = await prisma.budget.findMany({ where: { workspaceId, month: start, propertyId: null }, include: { category: { select: { name: true, emoji: true } } } });
  const spent = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { workspaceId, type: "EXPENSE", date: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  const spentBy = new Map(spent.map((s) => [s.categoryId, num(s._sum.amount)]));
  const rows = budgets.map((b) => ({ categoryId: b.categoryId, name: b.category.name, emoji: b.category.emoji, budget: num(b.amount), actual: spentBy.get(b.categoryId) ?? 0 }));
  const totalBudget = rows.reduce((a, r) => a + r.budget, 0);
  const totalActual = rows.reduce((a, r) => a + r.actual, 0);
  return { month, rows, totalBudget, totalActual, pct: totalBudget ? totalActual / totalBudget : 0 };
}

/** Últimos 6 meses de ingresos vs gastos (misma lógica de estado que el resumen). */
export async function sixMonthSeries(workspaceId: string, endMonth: string, status: StatusFilter) {
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(endMonth, i - 5));
  const out = [];
  for (const m of months) {
    const start = new Date(`${m}-01T00:00:00Z`);
    const end = new Date(`${shiftMonth(m, 1)}-01T00:00:00Z`);
    const { pyg } = await periodSummary(workspaceId, start, end, status);
    out.push({ month: m, income: pyg.grossRevenue, expense: pyg.variableCosts.total + pyg.fixedOpex.total });
  }
  return out;
}
