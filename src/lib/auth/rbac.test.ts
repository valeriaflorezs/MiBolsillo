import { describe, expect, it } from "vitest";
import { can, canMutateTx } from "./rbac";

const HOUR = 3_600_000;
const tx = (over: Partial<{ createdById: string; type: string; createdAt: Date }> = {}) => ({ createdById: "u1", type: "EXPENSE", createdAt: new Date(Date.now() - HOUR), ...over });

describe("permisos", () => {
  it("OPERATOR no ve EBITDA ni PyG pero sí registra gastos", () => {
    expect(can("OPERATOR", "dashboard:full")).toBe(false);
    expect(can("OPERATOR", "pyg:read")).toBe(false);
    expect(can("OPERATOR", "transaction:create")).toBe(true);
    expect(can("ADMIN", "pyg:read")).toBe(true);
  });
  it("ADMIN modifica cualquier movimiento", () => {
    expect(canMutateTx("ADMIN", tx({ createdById: "otro", type: "INCOME" }), "u1")).toBe(true);
  });
  it("OPERATOR solo modifica sus gastos recientes", () => {
    expect(canMutateTx("OPERATOR", tx(), "u1")).toBe(true);
    expect(canMutateTx("OPERATOR", tx({ createdById: "otro" }), "u1")).toBe(false);
    expect(canMutateTx("OPERATOR", tx({ type: "INCOME" }), "u1")).toBe(false);
    expect(canMutateTx("OPERATOR", tx({ createdAt: new Date(Date.now() - 49 * HOUR) }), "u1")).toBe(false);
  });
});
