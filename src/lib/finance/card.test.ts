import { describe, expect, it } from "vitest";
import { cardSummary, lastOccurrence, nextOccurrence } from "./card";

const D = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (d: Date | null) => d?.toISOString().slice(0, 10);

describe("tarjetas de crédito", () => {
  it("calcula deuda, cupo disponible y uso", () => {
    const s = cardSummary({ creditLimit: 5_000_000 }, -1_250_000, D("2026-10-10"));
    expect(s.debt).toBe(1_250_000);
    expect(s.available).toBe(3_750_000);
    expect(s.utilization).toBeCloseTo(0.25, 6);
  });

  it("un saldo a favor no es deuda y sin cupo no hay uso", () => {
    const s = cardSummary({}, 80_000, D("2026-10-10"));
    expect(s.debt).toBe(0); expect(s.credit).toBe(80_000);
    expect(s.available).toBeNull(); expect(s.utilization).toBeNull();
  });

  it("el cupo disponible no baja de cero si te pasas", () => {
    expect(cardSummary({ creditLimit: 1_000_000 }, -1_200_000, D("2026-10-10")).available).toBe(0);
  });

  it("encuentra el próximo y el último día de corte/pago", () => {
    expect(iso(nextOccurrence(D("2026-10-10"), 15))).toBe("2026-10-15");
    expect(iso(nextOccurrence(D("2026-10-15"), 15))).toBe("2026-10-15");
    expect(iso(nextOccurrence(D("2026-10-16"), 15))).toBe("2026-11-15");
    expect(iso(lastOccurrence(D("2026-10-10"), 15))).toBe("2026-09-15");
    expect(iso(lastOccurrence(D("2026-10-20"), 15))).toBe("2026-10-15");
  });

  it("los días 29-31 usan el último día de los meses cortos", () => {
    expect(iso(nextOccurrence(D("2027-02-10"), 31))).toBe("2027-02-28");
    expect(iso(nextOccurrence(D("2027-03-01"), 31))).toBe("2027-03-31");
    expect(iso(lastOccurrence(D("2027-03-10"), 31))).toBe("2027-02-28");
  });

  it("intereses de un mes (E.A. → mensual) y cargos fijos", () => {
    const s = cardSummary({ rateType: "EFFECTIVE_ANNUAL", ratePct: 30, managementFeeMonthly: 25_000, insuranceMonthly: 5_000, paymentDay: 20 }, -1_000_000, D("2026-10-10"));
    expect(s.interestIfUnpaid!).toBeCloseTo(1_000_000 * (Math.pow(1.3, 1 / 12) - 1), 4);
    expect(s.fees).toBe(30_000);
    expect(iso(s.nextDue)).toBe("2026-10-20"); expect(s.daysToDue).toBe(10);
    expect(cardSummary({}, -1, D("2026-10-10")).interestIfUnpaid).toBeNull();
  });
});
