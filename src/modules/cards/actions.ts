"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { run, userError, type ActionState } from "@/lib/actions";
import { requireWorkspace } from "@/lib/auth/permissions";
import { rateLimit } from "@/lib/security/rate-limit";
import { dateStr, id, money, optText, positive } from "@/lib/validation";

const optMoney = z.preprocess((v) => (v === "" || v == null ? undefined : v), money.optional());
const optDay = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number({ message: "Día inválido" }).int().min(1, "Del 1 al 31").max(31, "Del 1 al 31").optional());
const optPct = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number({ message: "Tasa inválida" }).min(0).max(100, "La tasa parece demasiado alta").optional());
const cardFields = {
  name: z.string().trim().min(2, "Pon un nombre").max(40),
  creditLimit: optMoney, cutoffDay: optDay, paymentDay: optDay,
  rateType: z.enum(["EFFECTIVE_ANNUAL", "MONTHLY"]).default("EFFECTIVE_ANNUAL"),
  ratePct: optPct, insuranceMonthly: optMoney, managementFeeMonthly: optMoney,
};
const refresh = (w: string) => { revalidatePath(`/w/${w}/accounts`); revalidatePath(`/w/${w}`, "layout"); };
const nameTaken = () => userError("Ya existe una cuenta con ese nombre.");

// Todo ID se verifica contra el workspace (anti-IDOR); la tarjeta es una cuenta CREDIT_CARD.
async function ownCard(workspaceId: string, cardId: string) {
  const card = await prisma.financialAccount.findFirst({ where: { id: cardId, workspaceId, type: "CREDIT_CARD" }, select: { id: true, name: true, insuranceMonthly: true, managementFeeMonthly: true, cutoffDay: true } });
  if (!card) throw new Error("NOT_FOUND");
  return card;
}

export async function createCardAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { workspaceId, debt, ...f } = z.object({ workspaceId: id, debt: optMoney, ...cardFields }).parse(Object.fromEntries(fd));
    const { userId } = await requireWorkspace(workspaceId, "dashboard:full");
    rateLimit(`card:${userId}`, 30, 3_600_000);
    try {
      await prisma.financialAccount.create({ data: { workspaceId, type: "CREDIT_CARD", emoji: "💳", openingBalance: -(debt ?? 0), ...f } });
    } catch { throw nameTaken(); }
    refresh(workspaceId);
    return "Tarjeta creada";
  });
}

export async function updateCardAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { workspaceId, cardId, debt, ...f } = z.object({ workspaceId: id, cardId: id, debt: optMoney, archived: z.preprocess((v) => v === "on", z.boolean()), ...cardFields }).parse(Object.fromEntries(fd));
    await requireWorkspace(workspaceId, "dashboard:full");
    await ownCard(workspaceId, cardId);
    try {
      await prisma.financialAccount.update({
        where: { id: cardId },
        data: { ...f, openingBalance: -(debt ?? 0), creditLimit: f.creditLimit ?? null, cutoffDay: f.cutoffDay ?? null, paymentDay: f.paymentDay ?? null, ratePct: f.ratePct ?? null, insuranceMonthly: f.insuranceMonthly ?? null, managementFeeMonthly: f.managementFeeMonthly ?? null },
      });
    } catch { throw nameTaken(); }
    refresh(workspaceId);
    return "Tarjeta actualizada";
  });
}

/** Pagar la tarjeta = transferencia desde una cuenta propia hacia la tarjeta (baja la deuda, baja la cuenta). */
export async function payCardAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, cardId: id, fromAccountId: id, amount: positive, date: dateStr }).parse(Object.fromEntries(fd));
    const { userId } = await requireWorkspace(i.workspaceId, "dashboard:full");
    rateLimit(`cardpay:${userId}`, 60, 3_600_000);
    const card = await ownCard(i.workspaceId, i.cardId);
    const from = await prisma.financialAccount.findFirst({ where: { id: i.fromAccountId, workspaceId: i.workspaceId, archived: false, type: { not: "CREDIT_CARD" } }, select: { id: true } });
    if (!from) throw userError("Elige la cuenta desde la que pagas.");
    await prisma.transaction.create({
      data: { workspaceId: i.workspaceId, type: "TRANSFER", status: "PAID", amount: i.amount, date: i.date, paidAt: i.date, accountId: from.id, transferAccountId: card.id, vendor: card.name, description: "Pago de tarjeta", createdById: userId },
    });
    refresh(i.workspaceId);
    return "Pago registrado";
  });
}

/** Carga como gastos de la tarjeta la cuota de manejo, el seguro y (opcional) los intereses del extracto de un mes. */
export async function chargeCardFeesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, cardId: id, month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes inválido"), interest: optMoney }).parse(Object.fromEntries(fd));
    const { userId } = await requireWorkspace(i.workspaceId, "dashboard:full");
    rateLimit(`cardfee:${userId}`, 60, 3_600_000);
    const card = await ownCard(i.workspaceId, i.cardId);
    const [y, m] = i.month.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, Math.min(card.cutoffDay ?? 1, new Date(Date.UTC(y, m, 0)).getUTCDate())));
    const items = [
      { vendor: "Cuota de manejo", amount: card.managementFeeMonthly ? Number(card.managementFeeMonthly) : 0 },
      { vendor: "Seguro de la tarjeta", amount: card.insuranceMonthly ? Number(card.insuranceMonthly) : 0 },
      { vendor: "Intereses de la tarjeta", amount: i.interest ?? 0 },
    ].filter((x) => x.amount > 0);
    if (!items.length) throw userError("No hay cuota de manejo, seguro ni intereses para cargar.");
    const marker = (v: string) => `Cargos ${card.name} ${i.month} · ${v}`;
    const exists = await prisma.transaction.findMany({ where: { workspaceId: i.workspaceId, accountId: card.id, description: { in: items.map((x) => marker(x.vendor)) } }, select: { description: true } });
    const done = new Set(exists.map((e) => e.description));
    const todo = items.filter((x) => !done.has(marker(x.vendor)));
    if (!todo.length) throw userError("Esos cargos ya estaban registrados para ese mes.");
    // Los cargos financieros no son operación: categoría propia fuera del EBITDA.
    const cat = (await prisma.category.findFirst({ where: { workspaceId: i.workspaceId, name: "Intereses y cargos financieros" }, select: { id: true } }))
      ?? (await prisma.category.create({ data: { workspaceId: i.workspaceId, name: "Intereses y cargos financieros", emoji: "🏦", expenseKind: "FIXED_OPEX", pygLine: "NON_OPERATING" }, select: { id: true } }));
    await prisma.transaction.createMany({
      data: todo.map((x) => ({ workspaceId: i.workspaceId, type: "EXPENSE" as const, status: "PAID" as const, amount: x.amount, date, paidAt: date, accountId: card.id, categoryId: cat.id, vendor: x.vendor, description: marker(x.vendor), createdById: userId })),
    });
    refresh(i.workspaceId);
    return `${todo.length} cargo(s) registrado(s)`;
  });
}
