import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { syncCapexPurchase } from "./capex-link";

describe.skipIf(!process.env.DATABASE_URL)("ítem CAPEX con varios gastos", () => {
  let workspaceId = "", itemId = "", accountId = "", userId = "";
  beforeAll(async () => {
    userId = (await prisma.user.create({ data: { email: `capex${Date.now()}@t.co` } })).id;
    workspaceId = (await prisma.workspace.create({ data: { name: "Capex link test", type: "AIRBNB" } })).id;
    const propertyId = (await prisma.property.create({ data: { workspaceId, name: "P" } })).id;
    accountId = (await prisma.financialAccount.create({ data: { workspaceId, name: "Caja", type: "CASH" } })).id;
    itemId = (await prisma.capexItem.create({ data: { workspaceId, propertyId, categoryId: (await prisma.category.create({ data: { workspaceId, name: "Menaje", expenseKind: "CAPEX", pygLine: "CAPEX" } })).id, itemDescription: "Set de cuchillos", quantity: 2, budgetedUnitPrice: 100000 } })).id;
  });
  afterAll(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  const expense = (amount: number, vendor: string, date: string) =>
    prisma.transaction.create({ data: { workspaceId, accountId, type: "EXPENSE", status: "PAID", amount, vendor, date: new Date(date), capexItemId: itemId, createdById: userId } });

  it("suma los gastos, junta las tiendas y vuelve a pendiente sin gastos", async () => {
    const a = await expense(60000, "Ikea", "2026-03-01");
    const b = await expense(90000, "Homecenter", "2026-03-05");
    await prisma.$transaction((tx) => syncCapexPurchase(tx, itemId));
    expect(await prisma.capexItem.findUnique({ where: { id: itemId } })).toMatchObject({ status: "PURCHASED", store: "Ikea, Homecenter" });
    expect(Number((await prisma.capexItem.findUnique({ where: { id: itemId } }))!.actualUnitPrice)).toBe(75000);

    await prisma.transaction.update({ where: { id: a.id }, data: { capexItemId: null } });
    await prisma.$transaction((tx) => syncCapexPurchase(tx, itemId));
    expect(Number((await prisma.capexItem.findUnique({ where: { id: itemId } }))!.actualUnitPrice)).toBe(45000);

    await prisma.transaction.delete({ where: { id: b.id } });
    await prisma.$transaction((tx) => syncCapexPurchase(tx, itemId));
    expect(await prisma.capexItem.findUnique({ where: { id: itemId } })).toMatchObject({ status: "PENDING", actualUnitPrice: null });
  });
});
