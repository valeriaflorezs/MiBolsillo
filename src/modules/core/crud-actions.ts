"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { run, userError, type ActionState } from "@/lib/actions";
import { requireUser, requireWorkspace } from "@/lib/auth/permissions";
import { canMutateTx } from "@/lib/auth/rbac";
import { rateLimit } from "@/lib/security/rate-limit";
import { syncCapexPurchase } from "@/modules/airbnb/capex-link";
import { deleteObjects } from "@/lib/storage/r2";
import { bool, dateStr, id, opt, optId, optText, positive, quantity, signedMoney } from "@/lib/validation";

const refresh = (w: string) => revalidatePath(`/w/${w}`, "layout");

/** Verifica que todos los IDs relacionados pertenezcan al mismo workspace (anti-IDOR). */
async function assertOwned(w: string, refs: { account?: string; transfer?: string; category?: string; property?: string }) {
  const checks = await Promise.all([
    refs.account ? prisma.financialAccount.count({ where: { id: refs.account, workspaceId: w } }) : 1,
    refs.transfer ? prisma.financialAccount.count({ where: { id: refs.transfer, workspaceId: w } }) : 1,
    refs.category ? prisma.category.count({ where: { id: refs.category, workspaceId: w } }) : 1,
    refs.property ? prisma.property.count({ where: { id: refs.property, workspaceId: w } }) : 1,
  ]);
  if (checks.some((c) => !c)) throw new Error("FORBIDDEN");
}

/* ───────────── Movimientos ───────────── */

export async function updateTransactionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({
      workspaceId: id, transactionId: id, type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]), status: z.enum(["PAID", "PENDING"]),
      amount: positive, date: dateStr, accountId: id, transferAccountId: optId, categoryId: optId,
      quantity: opt(quantity),
      vendor: optText(80), description: optText(300),
    }).parse(Object.fromEntries(fd));
    const { userId, role } = await requireWorkspace(i.workspaceId, "transaction:create");
    const tx = await prisma.transaction.findFirst({ where: { id: i.transactionId, workspaceId: i.workspaceId } });
    if (!tx || !canMutateTx(role, tx, userId)) throw new Error("FORBIDDEN");
    if (i.type !== "EXPENSE" && role !== "ADMIN") throw new Error("FORBIDDEN");
    if (i.type === "TRANSFER" && (!i.transferAccountId || i.transferAccountId === i.accountId)) throw userError("Elige una cuenta destino distinta.");
    await assertOwned(i.workspaceId, { account: i.accountId, transfer: i.transferAccountId, category: i.categoryId });
    const { transactionId, workspaceId, ...data } = i;
    await prisma.$transaction(async (db) => {
      await db.transaction.update({
        where: { id: transactionId },
        data: {
          ...data, transferAccountId: i.type === "TRANSFER" ? i.transferAccountId ?? null : null, quantity: i.quantity ?? null, categoryId: i.categoryId ?? null, paidAt: i.status === "PAID" ? tx.paidAt ?? i.date : null,
          ...(i.type !== "EXPENSE" ? { capexItemId: null } : {}),
        },
      });
      if (tx.capexItemId) await syncCapexPurchase(db, tx.capexItemId);
    });
    refresh(workspaceId);
    return "Cambios guardados";
  });
}

export async function deleteTransactionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, transactionId: id }).parse(Object.fromEntries(fd));
    const { userId, role } = await requireWorkspace(i.workspaceId, "transaction:create");
    const tx = await prisma.transaction.findFirst({ where: { id: i.transactionId, workspaceId: i.workspaceId }, include: { attachments: { select: { storageKey: true } } } });
    if (!tx || !canMutateTx(role, tx, userId)) throw new Error("FORBIDDEN");
    await deleteObjects(tx.attachments.map((a) => a.storageKey));
    await prisma.$transaction(async (db) => {
      await db.attachment.deleteMany({ where: { transactionId: tx.id } });
      await db.transaction.delete({ where: { id: tx.id } });
      if (tx.capexItemId) await syncCapexPurchase(db, tx.capexItemId);
    });
    refresh(i.workspaceId);
    redirect(`/w/${i.workspaceId}/transactions`);
  });
}

/* ───────────── Cuentas ───────────── */

export async function updateAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({
      workspaceId: id, accountId: id, name: z.string().trim().min(2, "Nombre muy corto").max(40),
      type: z.enum(["CASH", "BANK", "DIGITAL_WALLET", "CREDIT_CARD", "LOAN_FUND"]), openingBalance: signedMoney, archived: bool,
    }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "dashboard:full");
    const { workspaceId, accountId, ...data } = i;
    try {
      const r = await prisma.financialAccount.updateMany({ where: { id: accountId, workspaceId }, data });
      if (!r.count) throw new Error("NOT_FOUND");
    } catch (e) {
      if (e instanceof Error && e.message === "NOT_FOUND") throw e;
      throw userError("Ya existe una cuenta con ese nombre.");
    }
    refresh(workspaceId);
    return "Cuenta actualizada";
  });
}

/* ───────────── Categorías ───────────── */

const KIND = z.enum(["INCOME", "FIXED_OPEX", "VARIABLE", "CAPEX"]);
const PYG = z.enum(["COMMISSION", "CLEANING", "AMENITIES", "OTHER_VARIABLE", "ADMIN", "UTILITIES", "SUBSCRIPTIONS", "MAINTENANCE", "OTHER_FIXED", "CAPEX", "NON_OPERATING"]);

function categoryData(i: { kind: z.infer<typeof KIND>; pygLine: z.infer<typeof PYG> }) {
  return i.kind === "INCOME" ? { expenseKind: null, pygLine: "REVENUE" as const } : { expenseKind: i.kind, pygLine: i.kind === "CAPEX" ? ("CAPEX" as const) : i.pygLine };
}

export async function createCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, name: z.string().trim().min(2).max(40), emoji: optText(24), kind: KIND, pygLine: PYG.default("OTHER_VARIABLE") }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "dashboard:full");
    await prisma.category.create({ data: { workspaceId: i.workspaceId, name: i.name, emoji: i.emoji, ...categoryData(i) } });
    refresh(i.workspaceId);
    return "Categoría creada";
  });
}

export async function updateCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, categoryId: id, name: z.string().trim().min(2).max(40), emoji: optText(24), kind: KIND, pygLine: PYG.default("OTHER_VARIABLE"), archived: bool }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "dashboard:full");
    const r = await prisma.category.updateMany({ where: { id: i.categoryId, workspaceId: i.workspaceId }, data: { name: i.name, emoji: i.emoji ?? null, archived: i.archived, ...categoryData(i) } });
    if (!r.count) throw new Error("NOT_FOUND");
    refresh(i.workspaceId);
    return "Categoría actualizada";
  });
}

/* ───────────── Deseos, invitaciones, presupuesto ───────────── */

export async function deleteWishAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, wishId: id }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "transaction:create");
    await prisma.plannedPurchase.deleteMany({ where: { id: i.wishId, workspaceId: i.workspaceId } });
    refresh(i.workspaceId);
  });
}

export async function revokeInviteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, inviteId: id }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "member:manage");
    await prisma.workspaceInvite.deleteMany({ where: { id: i.inviteId, workspaceId: i.workspaceId } });
    refresh(i.workspaceId);
  });
}

/** Copia el presupuesto del mes anterior al mes indicado (reemplaza lo existente). */
export async function copyBudgetAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "budget:write");
    const [y, m] = i.month.split("-").map(Number);
    const to = new Date(Date.UTC(y, m - 1, 1)), from = new Date(Date.UTC(y, m - 2, 1));
    const prev = await prisma.budget.findMany({ where: { workspaceId: i.workspaceId, month: from, propertyId: null } });
    if (!prev.length) throw userError("El mes anterior no tiene presupuesto.");
    await prisma.$transaction([
      prisma.budget.deleteMany({ where: { workspaceId: i.workspaceId, month: to, propertyId: null } }),
      prisma.budget.createMany({ data: prev.map((b) => ({ workspaceId: i.workspaceId, categoryId: b.categoryId, month: to, amount: b.amount })) }),
    ]);
    refresh(i.workspaceId);
    return `${prev.length} categoría(s) copiadas`;
  });
}

/* ───────────── Cuenta del usuario ───────────── */

/** Elimina al usuario. Si es el único ADMIN de un negocio, ese negocio se elimina completo (con sus comprobantes). */
export async function deleteMyAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await requireUser();
    rateLimit(`delacct:${user.id}`, 3, 3_600_000);
    const { confirm } = z.object({ confirm: z.string() }).parse(Object.fromEntries(fd));
    if (confirm.trim().toLowerCase() !== (user.email ?? "").toLowerCase()) throw userError("Escribe tu correo exacto para confirmar.");

    const mine = await prisma.workspaceMember.findMany({ where: { userId: user.id }, select: { workspaceId: true } });
    for (const m of mine) {
      const heir = await prisma.workspaceMember.findFirst({ where: { workspaceId: m.workspaceId, role: "ADMIN", NOT: { userId: user.id } }, select: { userId: true } });
      if (!heir) {
        // Único administrador: el negocio se elimina por completo (con sus comprobantes en R2).
        const files = await prisma.attachment.findMany({ where: { workspaceId: m.workspaceId }, select: { storageKey: true } });
        await deleteObjects(files.map((f) => f.storageKey));
        await prisma.$transaction([
          prisma.attachment.deleteMany({ where: { workspaceId: m.workspaceId } }),
          prisma.transaction.deleteMany({ where: { workspaceId: m.workspaceId } }),
          prisma.workspace.delete({ where: { id: m.workspaceId } }),
        ]);
      } else {
        // Negocio compartido: los registros se conservan y pasan a otro administrador.
        await prisma.$transaction([
          prisma.transaction.updateMany({ where: { workspaceId: m.workspaceId, createdById: user.id }, data: { createdById: heir.userId } }),
          prisma.attachment.updateMany({ where: { workspaceId: m.workspaceId, uploadedById: user.id }, data: { uploadedById: heir.userId } }),
          prisma.workspaceInvite.updateMany({ where: { workspaceId: m.workspaceId, invitedById: user.id }, data: { invitedById: heir.userId } }),
        ]);
      }
    }
    await prisma.user.delete({ where: { id: user.id } }); // cascada: membresías
    redirect("/api/auth/signout");
  });
}
