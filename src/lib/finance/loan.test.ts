import { describe, expect, it } from "vitest";
import { addMonths, applyPayments, installment, loanSummary, monthlyRate, monthsToPayOff, schedule, type LoanTerms } from "./loan";

const D = (s: string) => new Date(`${s}T00:00:00Z`);
const T: LoanTerms = { principal: 1_000_000, rateType: "EFFECTIVE_ANNUAL", ratePct: 24, termMonths: 12, firstPaymentDate: D("2026-11-15") };

describe("crédito", () => {
  it("convierte E.A. a mensual y calcula la cuota fija", () => {
    expect(monthlyRate("EFFECTIVE_ANNUAL", 24)).toBeCloseTo(0.018088, 5);
    expect(monthlyRate("MONTHLY", 2)).toBe(0.02);
    expect(installment(1_000_000, 0, 10)).toBe(100_000);
  });

  it("el plan de pagos amortiza todo el capital y termina en cero", () => {
    const s = schedule(T);
    expect(s).toHaveLength(12);
    expect(s.reduce((a, r) => a + r.principal, 0)).toBeCloseTo(1_000_000, 2);
    expect(s[11].balance).toBe(0);
    expect(new Set(s.map((r) => Math.round(r.payment))).size).toBe(1); // cuota constante
    expect(s[0].interest).toBeGreaterThan(s[11].interest);
  });

  it("pagar exactamente el plan deja el saldo en cero", () => {
    const pays = schedule(T).map((r) => ({ date: r.date, kind: "INSTALLMENT" as const, amount: r.payment }));
    const a = applyPayments(T, pays);
    expect(a.balance).toBeLessThan(1);
    expect(a.paidPrincipal).toBeCloseTo(1_000_000, 0);
  });

  it("un abono extra reduce los meses que faltan", () => {
    const base = loanSummary(T, [{ date: D("2026-11-15"), kind: "INSTALLMENT", amount: schedule(T)[0].payment }], D("2026-11-20"));
    const extra = loanSummary(T, [{ date: D("2026-11-15"), kind: "INSTALLMENT", amount: schedule(T)[0].payment }, { date: D("2026-11-20"), kind: "EXTRA", amount: 300_000 }], D("2026-11-21"));
    expect(base.monthsLeft).toBe(11);
    expect(extra.monthsLeft).toBeLessThan(11);
    expect(extra.interestLeft!).toBeLessThan(base.interestLeft!);
  });

  it("detecta cuotas atrasadas y la próxima cuota", () => {
    const s = loanSummary(T, [{ date: D("2026-11-15"), kind: "INSTALLMENT", amount: schedule(T)[0].payment }], D("2027-02-20"));
    expect(s.installmentsPaid).toBe(1);
    expect(s.overdue).toBe(3); // vencidas: nov, dic, ene, feb → 4 − 1 pagada
    expect(s.next?.n).toBe(2);
  });

  it("una cuota que no cubre intereses no amortiza (Infinity) y no cuelga", () => {
    expect(monthsToPayOff(1_000_000, 0.02, 10_000)).toBe(Infinity);
    expect(schedule({ ...T, monthlyPayment: 10_000 }).length).toBeLessThanOrEqual(24);
  });

  it("suma meses conservando el día y recortando al fin de mes", () => {
    expect(addMonths(D("2026-01-31"), 1).toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(addMonths(D("2026-11-15"), 3).toISOString().slice(0, 10)).toBe("2027-02-15");
  });

  it("el seguro y la cuota de manejo se suman a la cuota sin amortizar", () => {
    const W = { ...T, insuranceMonthly: 30_000, managementFeeMonthly: 20_000 };
    expect(schedule(W)[0].payment).toBeCloseTo(schedule(T)[0].payment, 6); // capital + intereses no cambian
    expect(schedule(W)[0].fees).toBe(50_000);
    const s = loanSummary(W, [], D("2026-11-01"));
    expect(s.cuotaTotal).toBeCloseTo(s.cuota + 50_000, 6);
    expect(s.plannedFees).toBe(50_000 * s.plan.length);
  });

  it("un pago con seguro descuenta esos cargos antes de intereses y capital", () => {
    const total = schedule(T)[0].payment + 50_000;
    const a = applyPayments(T, [{ date: D("2026-11-15"), kind: "INSTALLMENT", amount: total, fees: 50_000 }]);
    const b = applyPayments(T, [{ date: D("2026-11-15"), kind: "INSTALLMENT", amount: schedule(T)[0].payment }]);
    expect(a.balance).toBeCloseTo(b.balance, 6);
    expect(a.paidFees).toBe(50_000);
    expect(a.paidTotal).toBeCloseTo(total, 6);
    // sin snapshot de cargos (pagos antiguos) todo el pago se aplica como antes
    expect(applyPayments(T, [{ date: D("2026-11-15"), kind: "INSTALLMENT", amount: total }]).paidFees).toBe(0);
    // un abono extra ignora los cargos
    expect(applyPayments(T, [{ date: D("2026-11-15"), kind: "EXTRA", amount: 100_000, fees: 50_000 }]).paidFees).toBe(0);
  });
});
