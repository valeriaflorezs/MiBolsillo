import { describe, expect, it } from "vitest";
import { resolveRange } from "./admin-range";

const now = new Date("2026-10-28T15:30:00Z"); // 10:30 en Bogotá

describe("resolveRange", () => {
  it("por omisión son los últimos 7 días", () => {
    const r = resolveRange({}, now);
    expect(r.key).toBe("7d");
    expect(r.desde).toBe("2026-10-22");
    expect(r.hasta).toBe("2026-10-28");
    expect(r.from?.toISOString()).toBe("2026-10-22T05:00:00.000Z");
    expect(r.to?.toISOString()).toBe("2026-10-29T04:59:59.999Z");
  });
  it("hoy y este mes", () => {
    expect(resolveRange({ rango: "hoy" }, now).desde).toBe("2026-10-28");
    expect(resolveRange({ rango: "mes" }, now).desde).toBe("2026-10-01");
  });
  it("todo no limita fechas", () => {
    expect(resolveRange({ rango: "todo" }, now).where).toBeUndefined();
  });
  it("fechas propias tienen prioridad y se ignoran las inválidas", () => {
    const r = resolveRange({ desde: "2026-09-01", hasta: "2026-09-30" }, now);
    expect(r.key).toBe("custom");
    expect(r.where?.gte?.toISOString()).toBe("2026-09-01T05:00:00.000Z");
    expect(resolveRange({ desde: "xx", hasta: "2026-13-45" }, now).key).toBe("7d");
  });
});
