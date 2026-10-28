import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { activityOverview, aiOverview } from "./queries";

describe.skipIf(!process.env.DATABASE_URL)("panel de administración", () => {
  const tag = `adm${Date.now()}`;
  let userId = "", workspaceId = "";
  beforeAll(async () => {
    userId = (await prisma.user.create({ data: { email: `${tag}@t.co`, username: tag, name: "Persona" } })).id;
    workspaceId = (await prisma.workspace.create({ data: { name: `Empresa ${tag}`, type: "PERSONAL", members: { create: { userId, role: "VIEWER" } } } })).id;
  });
  afterAll(async () => {
    await prisma.activityLog.deleteMany({ where: { OR: [{ userId }, { workspaceId }] } });
    await prisma.aiUsage.deleteMany({ where: { workspaceId } });
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("resume la actividad por tipo y usuario y filtra lo fallido", async () => {
    await logActivity({ kind: "LOGIN", userId, summary: "Ingresó a la plataforma" }, { ip: "1.2.3.4" });
    await logActivity({ kind: "QUERY", userId, workspaceId, summary: "Consultó los movimientos" }, {});
    await logActivity({ kind: "CHANGE", userId, workspaceId, summary: "Registró o modificó movimientos" }, {});
    await logActivity({ kind: "CHANGE", ok: false, userId, workspaceId, summary: "Falló: algo", detail: "FORBIDDEN" }, {});
    await logActivity({ kind: "LOGIN", ok: false, username: `${tag}-x`, summary: "Intento de ingreso rechazado" }, {});

    const all = await activityOverview({ rango: "todo", empresa: workspaceId });
    expect(all.totals).toMatchObject({ total: 3, changes: 2, failed: 1 });
    const row = all.perUser.find((r) => r.userId === userId)!;
    expect(row).toMatchObject({ label: tag, queries: 1, changes: 2, failed: 1 });

    const failed = await activityOverview({ rango: "todo", usuario: userId, fallo: "1" });
    expect(failed.logs.map((l) => l.summary)).toEqual(["Falló: algo"]);
    const search = await activityOverview({ rango: "todo", q: `${tag}-x` });
    expect(search.totals).toMatchObject({ total: 1, access: 1, failed: 1 });
  });

  it("suma el consumo de IA por empresa", async () => {
    await prisma.aiUsage.createMany({ data: [
      { userId, workspaceId, provider: "claude", model: "m", inputTokens: 1000, outputTokens: 50 },
      { userId, workspaceId, provider: "claude", model: "m", inputTokens: 500, outputTokens: 25 },
      { userId, workspaceId, provider: "claude", ok: false, error: "boom" },
    ] });
    const o = await aiOverview({ rango: "todo", empresa: workspaceId });
    expect(o.totals).toEqual({ ok: 2, failed: 1, input: 1500, output: 75 });
    expect(o.perWorkspace[0]).toMatchObject({ label: `Empresa ${tag}`, ok: 2, failed: 1 });
  });
});
