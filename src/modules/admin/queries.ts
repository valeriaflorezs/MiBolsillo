import type { ActivityKind, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { resolveRange } from "@/lib/admin-range";

export type ActivitySP = { rango?: string; desde?: string; hasta?: string; empresa?: string; usuario?: string; tipo?: string; q?: string; fallo?: string; pagina?: string };
export const KIND_LABEL: Record<ActivityKind, string> = { LOGIN: "Ingreso", LOGOUT: "Salida", QUERY: "Consulta", CHANGE: "Cambio", AI: "IA", ADMIN: "Admin." };
const KINDS = new Set<string>(Object.keys(KIND_LABEL));
export const PAGE_SIZE = 100;

export function activityWhere(sp: ActivitySP): Prisma.ActivityLogWhereInput {
  const range = resolveRange(sp);
  const q = sp.q?.trim();
  return {
    ...(range.where ? { createdAt: range.where } : {}),
    ...(sp.empresa ? { workspaceId: sp.empresa } : {}),
    ...(sp.usuario ? { userId: sp.usuario } : {}),
    ...(sp.tipo && KINDS.has(sp.tipo) ? { kind: sp.tipo as ActivityKind } : {}),
    ...(sp.fallo === "1" ? { ok: false } : {}),
    ...(q ? { OR: [{ summary: { contains: q, mode: "insensitive" } }, { detail: { contains: q, mode: "insensitive" } }, { username: { contains: q, mode: "insensitive" } }, { ip: { contains: q } }] } : {}),
  };
}

/** Nombres de empresas por id (el registro no tiene FK, así que se resuelven aparte). */
export async function workspaceNames(ids: (string | null)[]) {
  const list = [...new Set(ids.filter((i): i is string => !!i))];
  const rows = list.length ? await prisma.workspace.findMany({ where: { id: { in: list } }, select: { id: true, name: true } }) : [];
  return new Map(rows.map((w) => [w.id, w.name]));
}

export async function activityOverview(sp: ActivitySP) {
  const where = activityWhere(sp);
  const page = Math.max(1, Number(sp.pagina) || 1);
  const [groups, total, logs, totalUsers, users, workspaces] = await Promise.all([
    prisma.activityLog.groupBy({ by: ["userId", "username", "kind", "ok"], where, _count: { _all: true }, _max: { createdAt: true } }),
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.user.count(),
    prisma.user.findMany({ select: { id: true, username: true, email: true, name: true, memberships: { select: { workspace: { select: { name: true } } } } }, orderBy: { createdAt: "asc" } }),
    prisma.workspace.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const names = await workspaceNames(logs.map((l) => l.workspaceId));
  const userMap = new Map(users.map((u) => [u.id, u]));

  const totals = { total, access: 0, changes: 0, ai: 0, failed: 0 };
  type Row = { key: string; userId: string | null; label: string; name: string | null; empresas: string; access: number; queries: number; changes: number; ai: number; admin: number; failed: number; last: Date | null };
  const byUser = new Map<string, Row>();
  for (const g of groups) {
    const n = g._count._all;
    if (g.kind === "LOGIN" || g.kind === "LOGOUT") totals.access += n;
    if (g.kind === "CHANGE" || g.kind === "ADMIN") totals.changes += n;
    if (g.kind === "AI") totals.ai += n;
    if (!g.ok) totals.failed += n;
    const key = g.userId ?? `?${g.username ?? ""}`;
    const u = g.userId ? userMap.get(g.userId) : undefined;
    const r = byUser.get(key) ?? { key, userId: g.userId, label: u?.username ?? u?.email ?? g.username ?? "Desconocido", name: u?.name ?? null, empresas: u ? [...new Set(u.memberships.map((m) => m.workspace.name))].join(", ") : "—", access: 0, queries: 0, changes: 0, ai: 0, admin: 0, failed: 0, last: null };
    if (g.kind === "LOGIN" || g.kind === "LOGOUT") r.access += n;
    if (g.kind === "QUERY") r.queries += n;
    if (g.kind === "CHANGE") r.changes += n;
    if (g.kind === "AI") r.ai += n;
    if (g.kind === "ADMIN") r.admin += n;
    if (!g.ok) r.failed += n;
    if (g._max.createdAt && (!r.last || g._max.createdAt > r.last)) r.last = g._max.createdAt;
    byUser.set(key, r);
  }
  const perUser = [...byUser.values()].sort((a, b) => (b.last?.getTime() ?? 0) - (a.last?.getTime() ?? 0));
  return { totals, perUser, activeUsers: perUser.filter((r) => r.userId).length, totalUsers, logs, names, users, workspaces, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export type AiSP = { rango?: string; desde?: string; hasta?: string; empresa?: string; usuario?: string };

export async function aiOverview(sp: AiSP) {
  const range = resolveRange(sp);
  const where: Prisma.AiUsageWhereInput = { ...(range.where ? { createdAt: range.where } : {}), ...(sp.empresa ? { workspaceId: sp.empresa } : {}), ...(sp.usuario ? { userId: sp.usuario } : {}) };
  const [byWs, byUser, recent, users, workspaces] = await Promise.all([
    prisma.aiUsage.groupBy({ by: ["workspaceId", "ok"], where, _count: { _all: true }, _sum: { inputTokens: true, outputTokens: true } }),
    prisma.aiUsage.groupBy({ by: ["userId", "ok"], where, _count: { _all: true }, _sum: { inputTokens: true, outputTokens: true } }),
    prisma.aiUsage.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.user.findMany({ select: { id: true, username: true, email: true }, orderBy: { createdAt: "asc" } }),
    prisma.workspace.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const wsName = new Map(workspaces.map((w) => [w.id, w.name]));
  const userName = new Map(users.map((u) => [u.id, u.username ?? u.email]));
  type Agg = { key: string; label: string; ok: number; failed: number; input: number; output: number };
  const fold = (rows: typeof byWs | typeof byUser, keyOf: (r: (typeof rows)[number]) => string | null, labelOf: (k: string | null) => string) => {
    const m = new Map<string, Agg>();
    for (const r of rows) {
      const k = keyOf(r);
      const a = m.get(k ?? "") ?? { key: k ?? "", label: labelOf(k), ok: 0, failed: 0, input: 0, output: 0 };
      if (r.ok) a.ok += r._count._all; else a.failed += r._count._all;
      a.input += r._sum.inputTokens ?? 0; a.output += r._sum.outputTokens ?? 0;
      m.set(k ?? "", a);
    }
    return [...m.values()].sort((a, b) => b.input + b.output - (a.input + a.output));
  };
  const perWorkspace = fold(byWs, (r) => ("workspaceId" in r ? r.workspaceId : null), (k) => (k && wsName.get(k)) || "—");
  const perUser = fold(byUser, (r) => ("userId" in r ? r.userId : null), (k) => (k && userName.get(k)) || "—");
  const sum = (f: (a: Agg) => number) => perWorkspace.reduce((t, a) => t + f(a), 0);
  return { range, perWorkspace, perUser, recent, wsName, userName, users, workspaces, totals: { ok: sum((a) => a.ok), failed: sum((a) => a.failed), input: sum((a) => a.input), output: sum((a) => a.output) } };
}
