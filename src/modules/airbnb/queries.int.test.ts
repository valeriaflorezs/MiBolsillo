import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { periodSummary } from "./queries";
import { listTransactions } from "@/modules/core/queries";

// Prueba de integración contra Postgres real (CI y local con DATABASE_URL).
describe.skipIf(!process.env.DATABASE_URL)("periodSummary / listTransactions", () => {
  let workspaceId = "";
  let adminId = "";
  let operatorId = "";
  const start = new Date("2026-03-01T00:00:00Z");
  const end = new Date("2026-04-01T00:00:00Z");

  beforeAll(async () => {
    const tag = Date.now();
    const [a, o] = await Promise.all([
      prisma.user.create({ data: { email: `admin${tag}@t.co` } }),
      prisma.user.create({ data: { email: `op${tag}@t.co` } }),
    ]);
    adminId = a.id; operatorId = o.id;
    const ws = await prisma.workspace.create({ data: { name: "T", type: "AIRBNB" } });
    workspaceId = ws.id;
    const [cleaning, admin] = await Promise.all([
      prisma.category.create({ data: { workspaceId, name: "Aseo", expenseKind: "VARIABLE", pygLine: "CLEANING" } }),
      prisma.category.create({ data: { workspaceId, name: "HOA", expenseKind: "FIXED_OPEX", pygLine: "ADMIN" } }),
    ]);
    const acc = await prisma.financialAccount.create({ data: { workspaceId, name: "Efectivo", type: "CASH" } });
    await prisma.transaction.create({ data: { workspaceId, type: "INCOME", accountId: acc.id, amount: 1_080_000, date: new Date("2026-03-05T00:00:00Z"), createdById: adminId } });
    const base = { workspaceId, type: "EXPENSE" as const, accountId: acc.id, date: new Date("2026-03-10T00:00:00Z") };
    await prisma.transaction.create({ data: { ...base, amount: 80_000, categoryId: cleaning.id, createdById: operatorId } });
    await prisma.transaction.create({ data: { ...base, amount: 300_000, categoryId: admin.id, createdById: adminId, status: "PENDING" } });
  });

  afterAll(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, operatorId] } } });
    await prisma.$disconnect();
  });

  it("devengo: incluye gastos pagados y por pagar", async () => {
    const { pyg } = await periodSummary(workspaceId, start, end, undefined);
    expect(pyg.grossRevenue).toBe(1_080_000);
    expect(pyg.contributionMargin).toBe(1_080_000 - 80_000);
    expect(pyg.ebitda).toBe(1_080_000 - 80_000 - 300_000);
  });

  it("filtro PAID excluye el gasto por pagar", async () => {
    const { pyg, cashFlow } = await periodSummary(workspaceId, start, end, "PAID");
    expect(pyg.fixedOpex.total).toBe(0);
    expect(cashFlow).toBe(1_080_000 - 80_000);
  });

  it("OPERATOR solo ve los gastos que registró; ADMIN ve todos", async () => {
    const f = { workspaceId, start, end };
    expect(await listTransactions({ ...f, role: "OPERATOR", userId: operatorId })).toHaveLength(1);
    expect(await listTransactions({ ...f, role: "ADMIN", userId: adminId })).toHaveLength(2);
  });

  it("no mezcla datos entre workspaces", async () => {
    const other = await periodSummary("clxxxxxxxxxxxxxxxxxxxxxxx", start, end, undefined);
    expect(other.pyg.grossRevenue).toBe(0);
  });
});
