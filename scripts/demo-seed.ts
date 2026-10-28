// Datos de demostración para desarrollo local: `DATABASE_URL=... npx tsx scripts/demo-seed.ts`
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_CATEGORIES } from "../src/modules/core/defaults";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const now = new Date();
const ym = (off: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + off, 1));
const day = (off: number, n: number) => new Date(ym(off).getTime() + (n - 1) * 86_400_000);

async function main() {
  const admin = await prisma.user.create({ data: { email: "admin@test.co", name: "Valeria Flórez" } });
  const op = await prisma.user.create({ data: { email: "operador@test.co", name: "Carlos Operador" } });
  const ws = await prisma.workspace.create({ data: { name: "Apto 302", type: "AIRBNB", members: { create: [{ userId: admin.id, role: "ADMIN" }, { userId: op.id, role: "OPERATOR" }] } } });
  await prisma.category.createMany({ data: DEFAULT_CATEGORIES.AIRBNB.map((c) => ({ workspaceId: ws.id, name: c.name, emoji: c.emoji, expenseKind: c.income ? null : c.kind, pygLine: c.pygLine })) });
  const cats = Object.fromEntries((await prisma.category.findMany({ where: { workspaceId: ws.id } })).map((c) => [c.name, c.id]));
  const [cash, nequi, bank] = await Promise.all([
    prisma.financialAccount.create({ data: { workspaceId: ws.id, name: "Efectivo", type: "CASH", emoji: "💵", openingBalance: 200000 } }),
    prisma.financialAccount.create({ data: { workspaceId: ws.id, name: "Nequi", type: "DIGITAL_WALLET", openingBalance: 500000 } }),
    prisma.financialAccount.create({ data: { workspaceId: ws.id, name: "Bancolombia", type: "BANK", openingBalance: 3000000 } }),
  ]);
  const prop = await prisma.property.create({ data: { workspaceId: ws.id, name: "Apto 302", address: "Cra 7 #45-10, Bogotá" } });
  for (let off = -5; off <= 0; off++) {
    const mk = (type: "EXPENSE" | "INCOME", amount: number, cat: string, vendor: string, n: number, by = admin.id, status: "PAID" | "PENDING" = "PAID", acc = nequi.id) =>
      prisma.transaction.create({ data: { workspaceId: ws.id, type, amount, categoryId: cats[cat], vendor, date: day(off, n), accountId: acc, createdById: by, status, propertyId: prop.id, paidAt: status === "PAID" ? day(off, n) : null } });
    await mk("INCOME", 1000000 + off * 20000, "Otros ingresos", "Huésped Airbnb", 4);
    await mk("INCOME", 1180000, "Otros ingresos", "Huésped Booking", 15);
    await mk("EXPENSE", 80000, "Aseo", "Aseo Express", 9, op.id);
    await mk("EXPENSE", 80000, "Aseo", "Aseo Express", 21, op.id);
    await mk("EXPENSE", 45000, "Amenities e insumos", "Éxito", 10, op.id, "PAID", cash.id);
    await mk("EXPENSE", 320000, "Administración (HOA)", "Edificio Torres", 5, admin.id, off === 0 ? "PENDING" : "PAID", bank.id);
    await mk("EXPENSE", 140000, "Servicios públicos", "Codensa", 12, admin.id, "PAID", bank.id);
    await mk("EXPENSE", 90000, "Internet y apps", "Netflix + WiFi", 15, admin.id, "PAID", bank.id);
    if (off % 2 === 0) await mk("INCOME", 150000, "Otros ingresos", "Servicio extra", 18);
  }
  await prisma.capexItem.createMany({ data: [
    { workspaceId: ws.id, propertyId: prop.id, categoryId: cats["Muebles y reformas"], itemDescription: "Cama queen", quantity: 1, budgetedUnitPrice: 1800000, actualUnitPrice: 1650000, status: "PURCHASED", purchasedAt: new Date(), store: "Homecenter" },
    { workspaceId: ws.id, propertyId: prop.id, categoryId: cats["Muebles y reformas"], itemDescription: "Nevera 300 L", quantity: 1, budgetedUnitPrice: 2400000, store: "Alkosto" },
    { workspaceId: ws.id, propertyId: prop.id, categoryId: cats["Muebles y reformas"], itemDescription: "Cuadros decorativos", quantity: 4, budgetedUnitPrice: 90000 },
  ] });
  await prisma.fixedExpense.createMany({ data: [
    { workspaceId: ws.id, propertyId: prop.id, concept: "HOA", name: "Administración edificio", amount: 320000, frequency: "MONTHLY", startsOn: ym(-6) },
    { workspaceId: ws.id, propertyId: prop.id, concept: "SUBSCRIPTIONS", name: "Netflix + WiFi", amount: 90000, frequency: "MONTHLY", startsOn: ym(-6) },
  ] });
  await prisma.plannedPurchase.create({ data: { workspaceId: ws.id, itemName: "Aspiradora robot", store: "Amazon", estimatedPrice: 900000 } });
  for (const [c, a] of [["Aseo", 200000], ["Administración (HOA)", 320000], ["Servicios públicos", 150000]] as const) await prisma.budget.create({ data: { workspaceId: ws.id, categoryId: cats[c], month: ym(0), amount: a } });
  console.log(JSON.stringify({ admin: admin.id, op: op.id, ws: ws.id }));
}
main().finally(() => prisma.$disconnect());
