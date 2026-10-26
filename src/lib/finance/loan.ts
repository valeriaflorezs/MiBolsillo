// Matemática de créditos (sistema francés: cuota fija). Pura y testeable; las fechas son UTC.
export type RateType = "EFFECTIVE_ANNUAL" | "MONTHLY";
export type LoanTerms = { principal: number; rateType: RateType; ratePct: number; termMonths: number; firstPaymentDate: Date; monthlyPayment?: number | null; insuranceMonthly?: number | null; managementFeeMonthly?: number | null };
export type ScheduleRow = { n: number; date: Date; payment: number; interest: number; principal: number; balance: number; fees: number };
export type Payment = { id?: string; date: Date; kind: "INSTALLMENT" | "EXTRA"; amount: number; interestOverride?: number | null; fees?: number | null };
export type AppliedPayment = Payment & { fees: number; interest: number; principal: number; balanceAfter: number };

/** Tasa mensual: la E.A. se convierte con (1+ea)^(1/12) − 1; la mensual se usa tal cual. */
export const monthlyRate = (type: RateType, ratePct: number) => (type === "MONTHLY" ? ratePct / 100 : Math.pow(1 + ratePct / 100, 1 / 12) - 1);

export const installment = (principal: number, r: number, n: number) => (r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n)));

/** Suma meses conservando el día (si el mes es más corto, usa su último día). */
export function addMonths(d: Date, k: number) {
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + k, day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, last)));
}

/** Cargos mensuales que no amortizan (seguro y cuota de manejo): se pagan junto con cada cuota. */
export const feesOf = (t: LoanTerms) => (t.insuranceMonthly ?? 0) + (t.managementFeeMonthly ?? 0);

export const cuotaOf = (t: LoanTerms) => t.monthlyPayment && t.monthlyPayment > 0 ? t.monthlyPayment : installment(t.principal, monthlyRate(t.rateType, t.ratePct), t.termMonths);

/** Plan de pagos teórico. Si la cuota informada no alcanza a cubrir intereses, se corta en el plazo pactado. */
export function schedule(t: LoanTerms): ScheduleRow[] {
  const r = monthlyRate(t.rateType, t.ratePct), c = cuotaOf(t);
  const rows: ScheduleRow[] = [];
  let bal = t.principal;
  const max = c > bal * r ? t.termMonths * 2 : t.termMonths;
  for (let n = 1; n <= max && bal > 0.5; n++) {
    const interest = bal * r;
    const pay = Math.min(c, bal + interest);
    const principal = pay - interest;
    bal = Math.max(0, bal - principal);
    rows.push({ n, date: addMonths(t.firstPaymentDate, n - 1), payment: pay, interest, principal, balance: bal < 0.5 ? 0 : bal, fees: feesOf(t) });
  }
  return rows;
}

/** Aplica los pagos reales en orden: cada cuota paga primero intereses (saldo × tasa); un abono extra va todo a capital. */
export function applyPayments(t: LoanTerms, payments: Payment[]) {
  const r = monthlyRate(t.rateType, t.ratePct);
  let bal = t.principal, paidInterest = 0, paidPrincipal = 0, paidFees = 0;
  const rows: AppliedPayment[] = [...payments].sort((a, b) => a.date.getTime() - b.date.getTime()).map((p) => {
    const fees = p.kind === "EXTRA" ? 0 : Math.min(p.fees ?? 0, p.amount);
    const interest = p.kind === "EXTRA" ? 0 : Math.min(p.interestOverride ?? bal * r, p.amount - fees);
    const principal = Math.min(p.amount - fees - interest, bal);
    bal -= principal; paidInterest += interest; paidPrincipal += principal; paidFees += fees;
    return { ...p, fees, interest, principal, balanceAfter: bal };
  });
  return { rows, balance: Math.max(0, bal), paidInterest, paidPrincipal, paidFees, paidTotal: paidInterest + paidPrincipal + paidFees };
}

/** Meses que faltan para saldar `balance` con cuota `c` (Infinity si la cuota no cubre los intereses). */
export function monthsToPayOff(balance: number, r: number, c: number) {
  if (balance <= 0.5) return 0;
  if (r === 0) return balance / c;
  if (balance * r >= c) return Infinity;
  return -Math.log(1 - (balance * r) / c) / Math.log(1 + r);
}

export function loanSummary(t: LoanTerms, payments: Payment[], today: Date) {
  const r = monthlyRate(t.rateType, t.ratePct), c = cuotaOf(t);
  const plan = schedule(t);
  const done = applyPayments(t, payments);
  const installmentsPaid = payments.filter((p) => p.kind === "INSTALLMENT").length;
  const due = plan.filter((p) => p.date <= today).length;
  const overdue = Math.max(0, due - installmentsPaid);
  const next = installmentsPaid < plan.length && done.balance > 0.5 ? plan[installmentsPaid] : null;
  const months = monthsToPayOff(done.balance, r, c);
  const monthsLeft = Number.isFinite(months) ? Math.ceil(months - 1e-9) : null;
  const anchor = next?.date ?? addMonths(today, 1);
  return {
    cuota: c, monthlyRate: r, plan, ...done, installmentsPaid, overdue, next,
    pctPaid: t.principal ? done.paidPrincipal / t.principal : 0,
    monthsLeft,
    payoffDate: monthsLeft === null ? null : done.balance <= 0.5 ? null : addMonths(anchor, Math.max(0, monthsLeft - 1)),
    interestLeft: Number.isFinite(months) ? Math.max(0, c * months - done.balance) : null,
    plannedInterest: plan.reduce((a, p) => a + p.interest, 0),
    fees: feesOf(t), cuotaTotal: c + feesOf(t),
    plannedFees: feesOf(t) * plan.length,
    feesLeft: monthsLeft === null ? null : feesOf(t) * monthsLeft,
  };
}
