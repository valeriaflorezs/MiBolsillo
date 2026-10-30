import { prisma } from "@/lib/db";
import { can } from "@/lib/auth/rbac";
import { categoryFilter } from "@/lib/category-filter";
import { balancesFrom } from "@/lib/finance/balances";
import { num } from "@/lib/format";
import type { Prisma, Role, TransactionStatus, TransactionType } from "@/generated/prisma/client";

/** Saldo por cuenta = saldo inicial + movimientos PAID (ingresos − gastos ± transferencias). */
export async function accountBalances(workspaceId: string, includeArchived = false) {
  const [accounts, tx] = await Promise.all([
    prisma.financialAccount.findMany({ where: { workspaceId, ...(includeArchived ? {} : { archived: false }) }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({ where: { workspaceId }, select: { type: true, status: true, amount: true, accountId: true, transferAccountId: true } }),
  ]);
  return balancesFrom(accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, emoji: a.emoji, archived: a.archived, openingBalance: num(a.openingBalance) })), tx.map((t) => ({ ...t, amount: num(t.amount) })));
}

export type TxFilter = {
  workspaceId: string; role: Role; userId: string; start: Date; end: Date;
  status?: TransactionStatus; q?: string; categoryId?: string; accountId?: string; propertyId?: string; type?: TransactionType;
  page?: number; pageSize?: number; exclude?: string[];
};

const txInclude = {
  category: { select: { name: true, emoji: true } },
  account: { select: { name: true } },
  attachments: { select: { id: true }, take: 1 },
  property: { select: { name: true } },
} satisfies Prisma.TransactionInclude;

function whereOf(f: TxFilter): Prisma.TransactionWhereInput {
  return {
    workspaceId: f.workspaceId,
    date: { gte: f.start, lt: f.end },
    ...(f.status ? { status: f.status } : {}),
    ...(f.type ? { type: f.type } : {}),
    ...(f.categoryId ? { categoryId: f.categoryId === "__none" ? null : f.categoryId } : {}), // «__none» = sin categoría
    ...(f.propertyId ? { propertyId: f.propertyId === "__none" ? null : f.propertyId } : {}), // «__none» = sin propiedad
    ...(f.accountId ? { OR: [{ accountId: f.accountId }, { transferAccountId: f.accountId }] } : {}),
    AND: [
      ...(f.q ? [{ OR: [{ vendor: { contains: f.q, mode: "insensitive" as const } }, { description: { contains: f.q, mode: "insensitive" as const } }] }] : []),
      ...(f.exclude?.length ? [categoryFilter(f.exclude)] : []),
    ],
    // El OPERATOR solo ve los GASTOS que él mismo registró.
    ...(can(f.role, "finance:read") ? {} : { createdById: f.userId, type: "EXPENSE" }),
  };
}

const toRow = (t: Prisma.TransactionGetPayload<{ include: typeof txInclude }>) => ({
  id: t.id, type: t.type, status: t.status, amount: num(t.amount), quantity: t.quantity == null ? null : num(t.quantity), date: t.date, vendor: t.vendor, description: t.description,
  category: t.category, property: t.property?.name ?? null, account: t.account.name, hasReceipt: t.attachments.length > 0, propertyId: t.propertyId, categoryId: t.categoryId, createdById: t.createdById, createdAt: t.createdAt,
});
export type TxRow = ReturnType<typeof toRow>;

export async function listTransactions(f: TxFilter) {
  const rows = await prisma.transaction.findMany({ where: whereOf(f), include: txInclude, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 300 });
  return rows.map(toRow);
}

/** Búsqueda con paginación (20 por página por defecto). */
export async function searchTransactions(f: TxFilter) {
  const pageSize = f.pageSize ?? 20;
  const page = Math.max(1, f.page ?? 1);
  const where = whereOf(f);
  const [rows, total, sums] = await Promise.all([
    prisma.transaction.findMany({ where, include: txInclude, orderBy: [{ date: "desc" }, { createdAt: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({ by: ["type"], where, _sum: { amount: true } }),
  ]);
  const sum = (t: string) => num(sums.find((s) => s.type === t)?._sum.amount);
  return { rows: rows.map(toRow), total, page, pages: Math.max(1, Math.ceil(total / pageSize)), income: sum("INCOME"), expense: sum("EXPENSE") };
}

export async function getTransactionDetail(workspaceId: string, id: string, role: Role, userId: string) {
  const t = await prisma.transaction.findFirst({
    where: { id, workspaceId, ...(can(role, "finance:read") ? {} : { createdById: userId, type: "EXPENSE" }) },
    include: {
      ...txInclude,
      attachments: { select: { id: true, fileName: true, fileType: true } },
      createdBy: { select: { name: true, email: true } },
      property: { select: { name: true } },
      transferAccount: { select: { name: true } },
    },
  });
  if (!t) return null;
  return {
    ...toRow({ ...t, attachments: t.attachments.slice(0, 1) }),
    attachments: t.attachments, createdBy: t.createdBy.name ?? t.createdBy.email, property: t.property?.name ?? null,
    transferAccount: t.transferAccount?.name ?? null, categoryId: t.categoryId, accountId: t.accountId, propertyId: t.propertyId,
    transferAccountId: t.transferAccountId, paidAt: t.paidAt,
  };
}

/** Gastos por pagar, vencidos primero. El OPERATOR solo ve los suyos. */
export async function pendingPayables(workspaceId: string, role: Role, userId: string, take = 50, exclude?: string[]) {
  const rows = await prisma.transaction.findMany({
    where: { workspaceId, status: "PENDING", type: { in: ["EXPENSE", "INCOME"] }, ...(can(role, "finance:read") ? {} : { createdById: userId, type: "EXPENSE" }), ...(exclude?.length ? { AND: [categoryFilter(exclude)] } : {}) },
    include: txInclude, orderBy: { date: "asc" }, take,
  });
  return rows.map(toRow);
}

export const categoryOptions = (workspaceId: string) =>
  prisma.category.findMany({
    where: { workspaceId, archived: false },
    select: { id: true, name: true, emoji: true, expenseKind: true, pygLine: true },
    orderBy: [{ expenseKind: "asc" }, { name: "asc" }],
  });

export const accountOptions = (workspaceId: string) =>
  prisma.financialAccount.findMany({ where: { workspaceId, archived: false }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } });

/** Movimientos pagados que coinciden en cuenta, tipo, monto y fecha: candidatos a estar repetidos (p. ej. por cargar dos veces el mismo Excel). */
export async function possibleDuplicates(workspaceId: string, limit = 15) {
  const groups = await prisma.transaction.groupBy({
    by: ["accountId", "type", "amount", "date"],
    where: { workspaceId, status: "PAID", type: { in: ["INCOME", "EXPENSE"] } },
    having: { id: { _count: { gt: 1 } } },
    _count: { id: true },
    orderBy: [{ date: "desc" }],
    take: limit,
  });
  const names = new Map((await prisma.financialAccount.findMany({ where: { workspaceId }, select: { id: true, name: true } })).map((a) => [a.id, a.name]));
  return groups.map((g) => ({ account: names.get(g.accountId) ?? "—", accountId: g.accountId, type: g.type, amount: num(g.amount), date: g.date, count: g._count.id, extra: (g._count.id - 1) * num(g.amount) }));
}
