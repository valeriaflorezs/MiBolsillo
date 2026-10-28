import { prisma } from "@/lib/db";
import { buildPyg, type PygExpenseRow } from "@/lib/finance/pyg";
import { num, shiftMonth } from "@/lib/format";
import type { TransactionStatus } from "@/generated/prisma/client";

export type StatusFilter = TransactionStatus | undefined; // undefined = todo (devengo)
export const parseStatus = (s?: string): StatusFilter => (s === "PENDING" ? "PENDING" : s === "ALL" ? undefined : "PAID");

import { categoryFilter, type CategoryExclusion } from "@/lib/category-filter";
export { categoryFilter, parseExclusion, type CategoryExclusion } from "@/lib/category-filter";

/** Ingreso de la operación: sin categoría o con categoría de línea REVENUE (excluye desembolsos de crédito, ajustes, etc.). */
const OPERATING_INCOME = { OR: [{ categoryId: null }, { category: { pygLine: "REVENUE" as const } }] };

/** Resumen de un rango: ingresos, gastos por línea de PyG, flujo de caja y estado de resultados. */
export async function periodSummary(workspaceId: string, start: Date, end: Date, status: StatusFilter, exclude?: CategoryExclusion) {
  const [incomeTx, incomeOperating, expenseTx] = await Promise.all([
    // Todo el dinero que entró (para el flujo de caja)…
    prisma.transaction.aggregate({
      where: { workspaceId, type: "INCOME", date: { gte: start, lt: end }, ...(status ? { status } : {}), ...categoryFilter(exclude) },
      _sum: { amount: true },
    }),
    // …y solo los ingresos de la operación (para el PyG): un desembolso de crédito o un ajuste de saldo no son ventas.
    prisma.transaction.aggregate({
      where: { workspaceId, type: "INCOME", date: { gte: start, lt: end }, ...(status ? { status } : {}), AND: [categoryFilter(exclude), OPERATING_INCOME] },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { workspaceId, type: "EXPENSE", date: { gte: start, lt: end }, ...(status ? { status } : {}), ...categoryFilter(exclude) },
      select: { amount: true, categoryId: true, category: { select: { pygLine: true } } },
    }),
  ]);
  const expenses: PygExpenseRow[] = expenseTx.map((t) => ({ pygLine: t.category?.pygLine ?? "OTHER_VARIABLE", amount: num(t.amount) }));
  const pyg = buildPyg(expenses, num(incomeOperating._sum.amount));
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
  const cashIn = num(incomeTx._sum.amount);
  return { pyg, cashFlow: cashIn - totalExpenses, expenseByCategory: expenseTx };
}

export async function budgetExecution(workspaceId: string, month: string, start: Date, end: Date, exclude?: CategoryExclusion) {
  const budgets = (await prisma.budget.findMany({ where: { workspaceId, month: start, propertyId: null }, include: { category: { select: { name: true, emoji: true } } } })).filter((b) => !exclude?.includes(b.categoryId));
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

/** Últimos 6 meses (en paralelo): ingresos, gastos, margen, EBITDA y flujo de caja. */
export async function sixMonthSeries(workspaceId: string, endMonth: string, status: StatusFilter, exclude?: CategoryExclusion) {
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(endMonth, i - 5));
  return Promise.all(
    months.map(async (m) => {
      const start = new Date(`${m}-01T00:00:00Z`);
      const end = new Date(`${shiftMonth(m, 1)}-01T00:00:00Z`);
      const { pyg, cashFlow } = await periodSummary(workspaceId, start, end, status, exclude);
      return { month: m, income: pyg.grossRevenue, expense: pyg.variableCosts.total + pyg.fixedOpex.total, margin: pyg.contributionMargin, ebitda: pyg.ebitda, cash: cashFlow };
    }),
  );
}

/** Gastos por categoría (top 6 + "Otros") para la dona. */
export async function categoryBreakdown(workspaceId: string, start: Date, end: Date, status: StatusFilter, exclude?: CategoryExclusion) {
  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { workspaceId, type: "EXPENSE", date: { gte: start, lt: end }, ...(status ? { status } : {}), ...categoryFilter(exclude) },
    _sum: { amount: true },
  });
  const cats = await prisma.category.findMany({ where: { workspaceId, id: { in: rows.flatMap((r) => (r.categoryId ? [r.categoryId] : [])) } }, select: { id: true, name: true, emoji: true } });
  const named = rows
    .map((r) => {
      const c = cats.find((x) => x.id === r.categoryId);
      return { label: c ? `${c.emoji ?? ""} ${c.name}`.trim() : "Sin categoría", value: num(r._sum.amount) };
    })
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  const top = named.slice(0, 6);
  const rest = named.slice(6).reduce((a, r) => a + r.value, 0);
  if (rest > 0) top.push({ label: "Otros", value: rest });
  return { items: top, total: named.reduce((a, r) => a + r.value, 0) };
}

export type Period = "day" | "week" | "month" | "year";
export const parsePeriod = (p?: string): Period => (p === "day" || p === "week" || p === "year" ? p : "month");

/** Rango [start,end) y etiqueta del periodo desplazado `offset` periodos desde hoy (UTC). */
export function periodRange(period: Period, offset: number, now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let start: Date, end: Date, label: string;
  if (period === "day") {
    start = new Date(d.getTime() + offset * 86_400_000); end = new Date(start.getTime() + 86_400_000);
    label = start.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  } else if (period === "week") {
    const dow = (d.getUTCDay() + 6) % 7; // lunes = 0
    start = new Date(d.getTime() - dow * 86_400_000 + offset * 7 * 86_400_000); end = new Date(start.getTime() + 7 * 86_400_000);
    label = `${start.toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "UTC" })} – ${new Date(end.getTime() - 86_400_000).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "UTC" })}`;
  } else if (period === "year") {
    start = new Date(Date.UTC(d.getUTCFullYear() + offset, 0, 1)); end = new Date(Date.UTC(d.getUTCFullYear() + offset + 1, 0, 1)); label = String(start.getUTCFullYear());
  } else {
    start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1)); end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset + 1, 1));
    label = start.toLocaleDateString("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
  }
  return { start, end, label };
}

/** Serie por subperiodo (horas no aplican: día = un solo punto) con ingresos y gastos, más comparación con el periodo anterior. */
export async function periodStats(workspaceId: string, period: Period, offset: number, status: StatusFilter, exclude?: CategoryExclusion) {
  const cur = periodRange(period, offset);
  const prev = periodRange(period, offset - 1);
  const [now, before, breakdown] = await Promise.all([
    periodSummary(workspaceId, cur.start, cur.end, status, exclude),
    periodSummary(workspaceId, prev.start, prev.end, status, exclude),
    categoryBreakdown(workspaceId, cur.start, cur.end, status, exclude),
  ]);
  // Buckets: año → 12 meses; mes/semana → días; día → 1.
  const buckets: { key: string; start: Date; end: Date }[] = [];
  if (period === "year") for (let m = 0; m < 12; m++) buckets.push({ key: String(m + 1).padStart(2, "0"), start: new Date(Date.UTC(cur.start.getUTCFullYear(), m, 1)), end: new Date(Date.UTC(cur.start.getUTCFullYear(), m + 1, 1)) });
  else for (let t = cur.start.getTime(); t < cur.end.getTime(); t += 86_400_000) buckets.push({ key: String(new Date(t).getUTCDate()), start: new Date(t), end: new Date(t + 86_400_000) });
  const [tx] = await Promise.all([
    prisma.transaction.findMany({ where: { workspaceId, type: { in: ["INCOME", "EXPENSE"] }, date: { gte: cur.start, lt: cur.end }, ...(status ? { status } : {}), ...categoryFilter(exclude) }, select: { type: true, amount: true, date: true, category: { select: { pygLine: true } } } }),
  ]);
  const series = buckets.map((b) => {
    const inB = (d: Date) => d >= b.start && d < b.end;
    const income = tx.filter((t) => t.type === "INCOME" && inB(t.date) && (!t.category || t.category.pygLine === "REVENUE")).reduce((a, t) => a + num(t.amount), 0);
    const expense = tx.filter((t) => t.type === "EXPENSE" && inB(t.date)).reduce((a, t) => a + num(t.amount), 0);
    return { month: b.key, income, expense };
  });
  const topVendors = await prisma.transaction.groupBy({
    by: ["vendor"], where: { workspaceId, type: "EXPENSE", vendor: { not: null }, date: { gte: cur.start, lt: cur.end }, ...(status ? { status } : {}), ...categoryFilter(exclude) }, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } }, take: 5,
  });
  return {
    label: cur.label, series, breakdown, pyg: now.pyg, cashFlow: now.cashFlow,
    prev: { income: before.pyg.grossRevenue, expense: before.pyg.variableCosts.total + before.pyg.fixedOpex.total, cash: before.cashFlow },
    topVendors: topVendors.map((v) => ({ vendor: v.vendor ?? "—", amount: num(v._sum.amount) })),
  };
}
