"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { run, userError, type ActionState } from "@/lib/actions";
import { requireWorkspace } from "@/lib/auth/permissions";
import { rateLimit } from "@/lib/security/rate-limit";
import { dateStr, id, money, opt, optId, optText, positive, quantity, signedMoney } from "@/lib/validation";


export async function createAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({
      workspaceId: id, name: z.string().trim().min(2, "Nombre muy corto").max(40),
      type: z.enum(["CASH", "BANK", "DIGITAL_WALLET", "CREDIT_CARD", "LOAN_FUND"]),
      openingBalance: opt(signedMoney).default(0),
    }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "dashboard:full");
    try {
      await prisma.financialAccount.create({ data: i });
    } catch {
      throw userError("Ya existe una cuenta con ese nombre.");
    }
    revalidatePath(`/w/${i.workspaceId}/accounts`);
    return "Cuenta creada";
  });
}

/** Crea un gasto/ingreso/transferencia. El OPERATOR solo puede registrar GASTOS. */
export async function createTransactionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({
      workspaceId: id,
      type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).default("EXPENSE"),
      status: z.enum(["PAID", "PENDING"]).default("PAID"),
      amount: positive, date: dateStr,
      accountId: id, transferAccountId: optId, categoryId: optId, propertyId: optId, attachmentId: optId,
      quantity: opt(quantity),
      vendor: optText(80), description: optText(300),
    }).parse(Object.fromEntries(fd));
    const { userId, role } = await requireWorkspace(i.workspaceId, "transaction:create");
    if (i.type !== "EXPENSE" && role !== "ADMIN") throw new Error("FORBIDDEN");
    rateLimit(`tx:${userId}`, 60, 60_000);

    // Todo ID relacionado debe pertenecer al mismo workspace (anti-IDOR).
    const w = i.workspaceId;
    const checks = await Promise.all([
      prisma.financialAccount.count({ where: { id: i.accountId, workspaceId: w } }),
      i.transferAccountId ? prisma.financialAccount.count({ where: { id: i.transferAccountId, workspaceId: w } }) : 1,
      i.categoryId ? prisma.category.count({ where: { id: i.categoryId, workspaceId: w } }) : 1,
      i.propertyId ? prisma.property.count({ where: { id: i.propertyId, workspaceId: w } }) : 1,
      i.attachmentId ? prisma.attachment.count({ where: { id: i.attachmentId, workspaceId: w, transactionId: null, uploadedById: userId } }) : 1,
    ]);
    if (checks.some((c) => !c)) throw new Error("FORBIDDEN");
    if (i.type === "TRANSFER" && (!i.transferAccountId || i.transferAccountId === i.accountId)) throw userError("Elige una cuenta destino distinta.");

    const { attachmentId, ...data } = i;
    await prisma.$transaction(async (tx) => {
      const t = await tx.transaction.create({
        data: { ...data, createdById: userId, paidAt: i.status === "PAID" ? i.date : null },
      });
      if (attachmentId) await tx.attachment.update({ where: { id: attachmentId }, data: { transactionId: t.id } });
    });
    revalidatePath(`/w/${w}`, "layout");
    return "Guardado";
  });
}

export async function markPaidAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, transactionId: id }).parse(Object.fromEntries(fd));
    const { userId, role } = await requireWorkspace(i.workspaceId, "transaction:create");
    const res = await prisma.transaction.updateMany({
      where: { id: i.transactionId, workspaceId: i.workspaceId, status: "PENDING", ...(role === "ADMIN" ? {} : { createdById: userId }) },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (!res.count) throw new Error("NOT_FOUND");
    revalidatePath(`/w/${i.workspaceId}`, "layout");
    return "Marcado como pagado";
  });
}

export async function addWishAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, itemName: z.string().trim().min(2).max(80), store: optText(60), estimatedPrice: positive }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "transaction:create");
    await prisma.plannedPurchase.create({ data: i });
    revalidatePath(`/w/${i.workspaceId}/wishlist`);
    return "Agregado";
  });
}

export async function toggleWishAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, wishId: id }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "transaction:create");
    const w = await prisma.plannedPurchase.findFirst({ where: { id: i.wishId, workspaceId: i.workspaceId } });
    if (!w) throw new Error("NOT_FOUND");
    await prisma.plannedPurchase.update({
      where: { id: w.id },
      data: w.status === "PENDING" ? { status: "PURCHASED", purchasedAt: new Date() } : { status: "PENDING", purchasedAt: null },
    });
    revalidatePath(`/w/${i.workspaceId}/wishlist`);
  });
}

/** Presupuesto mensual por categoría (ADMIN). Un campo `cat_<id>` por categoría; vacío = sin presupuesto. */
export async function saveBudgetAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { workspaceId, month } = z.object({ workspaceId: id, month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(Object.fromEntries(fd));
    await requireWorkspace(workspaceId, "budget:write");
    const monthDate = new Date(`${month}-01T00:00:00Z`);
    const cats = await prisma.category.findMany({ where: { workspaceId }, select: { id: true } });
    for (const c of cats) {
      const raw = String(fd.get(`cat_${c.id}`) ?? "").trim();
      const existing = await prisma.budget.findFirst({ where: { workspaceId, categoryId: c.id, propertyId: null, month: monthDate } });
      if (!raw) { if (existing) await prisma.budget.delete({ where: { id: existing.id } }); continue; }
      const amount = money.parse(raw);
      if (existing) await prisma.budget.update({ where: { id: existing.id }, data: { amount } });
      else await prisma.budget.create({ data: { workspaceId, categoryId: c.id, month: monthDate, amount } });
    }
    revalidatePath(`/w/${workspaceId}`, "layout");
    return "Presupuesto guardado";
  });
}
