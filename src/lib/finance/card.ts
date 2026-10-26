// Matemática de tarjetas de crédito. Pura y testeable; las fechas son UTC.
import { monthlyRate, type RateType } from "./loan";

export type CardTerms = {
  creditLimit?: number | null; cutoffDay?: number | null; paymentDay?: number | null;
  rateType?: RateType | null; ratePct?: number | null; insuranceMonthly?: number | null; managementFeeMonthly?: number | null;
};

const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const at = (y: number, m: number, day: number) => new Date(Date.UTC(y, m, Math.min(day, daysIn(y, m))));

/** Primera fecha ≥ hoy que cae en `day` (si el mes es corto usa su último día). */
export function nextOccurrence(today: Date, day: number) {
  const here = at(today.getUTCFullYear(), today.getUTCMonth(), day);
  return here >= today ? here : at(today.getUTCFullYear(), today.getUTCMonth() + 1, day);
}

/** Última fecha ≤ hoy que cae en `day`. */
export function lastOccurrence(today: Date, day: number) {
  const here = at(today.getUTCFullYear(), today.getUTCMonth(), day);
  return here <= today ? here : at(today.getUTCFullYear(), today.getUTCMonth() - 1, day);
}

export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

/** `balance` es el saldo contable de la cuenta: negativo = deuda. */
export function cardSummary(t: CardTerms, balance: number, today: Date) {
  const debt = Math.max(0, -balance);
  const credit = Math.max(0, balance); // saldo a favor (pagaste de más)
  const limit = t.creditLimit && t.creditLimit > 0 ? t.creditLimit : null;
  const r = t.rateType && t.ratePct != null ? monthlyRate(t.rateType, t.ratePct) : null;
  const fees = (t.insuranceMonthly ?? 0) + (t.managementFeeMonthly ?? 0);
  const nextCutoff = t.cutoffDay ? nextOccurrence(today, t.cutoffDay) : null;
  const lastCutoff = t.cutoffDay ? lastOccurrence(today, t.cutoffDay) : null;
  const nextDue = t.paymentDay ? nextOccurrence(today, t.paymentDay) : null;
  return {
    debt, credit, limit,
    available: limit == null ? null : Math.max(0, limit - debt),
    utilization: limit == null ? null : debt / limit,
    fees,
    /** Intereses de un mes si la deuda actual no se paga completa. */
    interestIfUnpaid: r == null ? null : debt * r,
    nextCutoff, lastCutoff, nextDue,
    daysToDue: nextDue ? daysBetween(today, nextDue) : null,
  };
}
