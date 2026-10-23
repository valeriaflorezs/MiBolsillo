import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} })); // periodRange es pura; evita abrir conexión
const { periodRange, parsePeriod } = await import("./queries");

describe("periodRange", () => {
  const now = new Date("2026-10-23T15:00:00Z"); // viernes
  it("semana: lunes a lunes", () => {
    const { start, end } = periodRange("week", 0, now);
    expect(start.toISOString()).toBe("2026-10-19T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-26T00:00:00.000Z");
  });
  it("mes con desplazamiento", () => {
    expect(periodRange("month", -1, now).start.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(periodRange("month", 0, now).end.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });
  it("año y día", () => {
    expect(periodRange("year", 0, now).end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(periodRange("day", 0, now).start.toISOString()).toBe("2026-10-23T00:00:00.000Z");
  });
  it("parsePeriod usa mes por defecto", () => {
    expect(parsePeriod("x")).toBe("month");
    expect(parsePeriod("year")).toBe("year");
  });
});
