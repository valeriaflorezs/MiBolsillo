import type { PygLine } from "@prisma/client";

/** Fila mínima ya filtrada por workspace/propiedad/mes y estado (PAID/PENDING según el selector). */
export interface PygExpenseRow {
  pygLine: PygLine;
  amount: number;
}
export interface PygReservationRow {
  grossAmount: number;
  cleaningFeeCharged: number;
  platformCommission: number;
}

export interface Pyg {
  grossRevenue: number;
  variableCosts: { commissions: number; cleaning: number; amenities: number; other: number; total: number };
  contributionMargin: number;
  contributionMarginPct: number;
  fixedOpex: { admin: number; utilities: number; subscriptions: number; maintenance: number; other: number; total: number };
  ebitda: number;
  ebitdaPct: number;
  capex: number; // informativo: queda fuera del EBITDA
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const line = (rows: PygExpenseRow[], l: PygLine) => sum(rows.filter((r) => r.pygLine === l).map((r) => r.amount));

/**
 * Ingresos brutos = noches + tarifa de aseo cobrada al huésped.
 * Comisión de plataforma viene de la reserva; el resto de costos, de transacciones EXPENSE.
 */
export function buildPyg(reservations: PygReservationRow[], expenses: PygExpenseRow[]): Pyg {
  const grossRevenue = sum(reservations.map((r) => r.grossAmount + r.cleaningFeeCharged));

  const commissions = sum(reservations.map((r) => r.platformCommission)) + line(expenses, "COMMISSION");
  const cleaning = line(expenses, "CLEANING");
  const amenities = line(expenses, "AMENITIES");
  const otherVar = line(expenses, "OTHER_VARIABLE");
  const variableTotal = commissions + cleaning + amenities + otherVar;

  const contributionMargin = grossRevenue - variableTotal;

  const admin = line(expenses, "ADMIN");
  const utilities = line(expenses, "UTILITIES");
  const subscriptions = line(expenses, "SUBSCRIPTIONS");
  const maintenance = line(expenses, "MAINTENANCE");
  const otherFixed = line(expenses, "OTHER_FIXED");
  const fixedTotal = admin + utilities + subscriptions + maintenance + otherFixed;

  const ebitda = contributionMargin - fixedTotal;
  const pct = (n: number) => (grossRevenue === 0 ? 0 : n / grossRevenue);

  return {
    grossRevenue,
    variableCosts: { commissions, cleaning, amenities, other: otherVar, total: variableTotal },
    contributionMargin,
    contributionMarginPct: pct(contributionMargin),
    fixedOpex: { admin, utilities, subscriptions, maintenance, other: otherFixed, total: fixedTotal },
    ebitda,
    ebitdaPct: pct(ebitda),
    capex: line(expenses, "CAPEX"),
  };
}

/** Variación CAPEX: positivo = ahorro vs. presupuesto. */
export function capexVariance(item: { quantity: number; budgetedUnitPrice: number; actualUnitPrice: number | null }) {
  const budgeted = item.quantity * item.budgetedUnitPrice;
  if (item.actualUnitPrice == null) return { budgeted, actual: null, variance: null };
  const actual = item.quantity * item.actualUnitPrice;
  return { budgeted, actual, variance: budgeted - actual };
}
