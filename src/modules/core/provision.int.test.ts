import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { provisionWorkspace } from "./provision";

describe.skipIf(!process.env.DATABASE_URL)("provisionWorkspace", () => {
  let userId = "", workspaceId = "";
  beforeAll(async () => { userId = (await prisma.user.create({ data: { email: `prov${Date.now()}@t.co` } })).id; });
  afterAll(async () => {
    if (workspaceId) await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("crea el negocio con administrador, categorías, efectivo y propiedad (Airbnb)", async () => {
    const w = await prisma.$transaction((tx) => provisionWorkspace(tx, { name: "Empresa nueva", type: "AIRBNB", adminUserId: userId }));
    workspaceId = w.id;
    expect(await prisma.workspaceMember.findFirst({ where: { workspaceId, userId } })).toMatchObject({ role: "ADMIN" });
    expect(await prisma.category.count({ where: { workspaceId } })).toBeGreaterThan(5);
    expect(await prisma.financialAccount.findMany({ where: { workspaceId } })).toMatchObject([{ name: "Efectivo", type: "CASH" }]);
    expect(await prisma.property.findMany({ where: { workspaceId } })).toMatchObject([{ name: "Empresa nueva" }]);
  });
});
