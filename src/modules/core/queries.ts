import { prisma } from "@/lib/db";
import { can } from "@/lib/auth/rbac";
import { num } from "@/lib/format";
import type { Role, TransactionStatus } from "@/generated/prisma/client";

/** Saldo por cuenta = saldo inicial + movimientos PAID (ingresos − gastos ± transferencias). */
export async function accountBalances(workspaceId: string) {
  const [accounts, tx] = await Promise.all([
    prisma.financialAccount.findMany({ where: { workspaceId, archived: false }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({
      where: { workspaceId, status: "PAID" },
      select: { type: true, amount: true, accountId: true, transferAccountId: true },
    }),
  ]);
  const bal = new Map(accounts.map((a) => [a.id, num(a.openingBalance)]));
  for (const t of tx) {
    const a = num(t.amount);
    if (t.type === "INCOME") bal.set(t.accountId, (bal.get(t.accountId) ?? 0) + a);
    else if (t.type === "EXPENSE") bal.set(t.accountId, (bal.get(t.accountId) ?? 0) - a);
    else {
      bal.set(t.accountId, (bal.get(t.accountId) ?? 0) - a);
      if (t.transferAccountId) bal.set(t.transferAccountId, (bal.get(t.transferAccountId) ?? 0) + a);
    }
  }
  return accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, emoji: a.emoji, balance: bal.get(a.id) ?? 0 }));
}

export type TxFilter = { workspaceId: string; role: Role; userId: string; start: Date; end: Date; status?: TransactionStatus };

/** El OPERATOR solo ve los GASTOS que él mismo registró. */
export async function listTransactions(f: TxFilter) {
  const rows = await prisma.transaction.findMany({
    where: {
      workspaceId: f.workspaceId,
      date: { gte: f.start, lt: f.end },
      ...(f.status ? { status: f.status } : {}),
      ...(can(f.role, "dashboard:full") ? {} : { createdById: f.userId, type: "EXPENSE" }),
    },
    include: {
      category: { select: { name: true, emoji: true } },
      account: { select: { name: true } },
      attachments: { select: { id: true }, take: 1 },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 300,
  });
  return rows.map((t) => ({
    id: t.id, type: t.type, status: t.status, amount: num(t.amount), date: t.date, vendor: t.vendor, description: t.description,
    category: t.category, account: t.account.name, hasReceipt: t.attachments.length > 0,
  }));
}

export const categoryOptions = (workspaceId: string) =>
  prisma.category.findMany({
    where: { workspaceId, archived: false },
    select: { id: true, name: true, emoji: true, expenseKind: true, pygLine: true },
    orderBy: [{ expenseKind: "asc" }, { name: "asc" }],
  });

export const accountOptions = (workspaceId: string) =>
  prisma.financialAccount.findMany({ where: { workspaceId, archived: false }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } });
