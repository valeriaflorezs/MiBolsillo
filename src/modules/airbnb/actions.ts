"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { run, userError, type ActionState } from "@/lib/actions";
import { requireWorkspace } from "@/lib/auth/permissions";
import { monthRange } from "@/lib/format";
import { dateStr, id, intBetween, money, opt, optId, optText, positive } from "@/lib/validation";
import { syncCapexPurchase } from "./capex-link";

const refresh = (w: string) => revalidatePath(`/w/${w}`, "layout");

async function ownProperty(workspaceId: string, propertyId: string) {
  if (!(await prisma.property.count({ where: { id: propertyId, workspaceId } }))) throw new Error("FORBIDDEN");
}

async function ownCapexCategory(workspaceId: string, categoryId: string) {
  if (!(await prisma.category.count({ where: { id: categoryId, workspaceId, expenseKind: "CAPEX" } }))) throw userError("Elige una categoría de tipo CAPEX.");
}

export async function createPropertyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, name: z.string().trim().min(2).max(80), address: optText(160) }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "airbnb:manage");
    await prisma.property.create({ data: i });
    refresh(i.workspaceId);
    return "Propiedad creada";
  });
}

export async function addCapexAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({
      workspaceId: id, propertyId: id,
      categoryId: id,
      itemDescription: z.string().trim().min(2, "Describe el ítem").max(120),
      quantity: intBetween(1, 10_000, "Cantidad"), budgetedUnitPrice: money, store: optText(60),
    }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "airbnb:manage");
    await ownProperty(i.workspaceId, i.propertyId);
    await ownCapexCategory(i.workspaceId, i.categoryId);
    await prisma.capexItem.create({ data: i });
    refresh(i.workspaceId);
    return "Ítem agregado";
  });
}

/**
 * Vincula un ítem CAPEX con uno o varios gastos ya registrados en Movimientos (precio real = suma de los montos / cantidad,
 * tienda = proveedores), quita uno de ellos o deshace todos los vínculos. Nunca borra movimientos. Permitido al OPERATOR.
 */
export async function updateCapexAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({
      workspaceId: id, itemId: id, intent: z.enum(["link", "unlink", "undo"]),
      transactionIds: z.array(id).max(100).default([]),
    }).parse({ ...Object.fromEntries(fd), transactionIds: fd.getAll("transactionId") });
    await requireWorkspace(i.workspaceId, "capex:update");
    const item = await prisma.capexItem.findFirst({ where: { id: i.itemId, workspaceId: i.workspaceId } });
    if (!item) throw new Error("NOT_FOUND");
    if (i.intent === "link") {
      if (!i.transactionIds.length) throw userError("Elige al menos un gasto.");
      const n = await prisma.transaction.count({ where: { id: { in: i.transactionIds }, workspaceId: i.workspaceId, type: "EXPENSE", capexItemId: null } });
      if (n !== i.transactionIds.length) throw userError("Alguno de esos gastos ya no está disponible.");
    }
    await prisma.$transaction(async (tx) => {
      if (i.intent === "link") await tx.transaction.updateMany({ where: { id: { in: i.transactionIds }, workspaceId: i.workspaceId }, data: { capexItemId: item.id } });
      else await tx.transaction.updateMany({ where: { workspaceId: i.workspaceId, capexItemId: item.id, ...(i.intent === "unlink" ? { id: { in: i.transactionIds } } : {}) }, data: { capexItemId: null } });
      await syncCapexPurchase(tx, item.id);
    });
    refresh(i.workspaceId);
  });
}

export async function createFixedExpenseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({
      workspaceId: id, propertyId: id, concept: z.enum(["HOA", "UTILITIES", "SUBSCRIPTIONS", "MAINTENANCE", "OTHER"]),
      name: z.string().trim().min(2).max(80), amount: positive,
      frequency: z.enum(["MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"]),
      dayOfMonth: opt(intBetween(1, 28, "Día del mes")).default(1),
    }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "airbnb:manage");
    await ownProperty(i.workspaceId, i.propertyId);
    await prisma.fixedExpense.create({ data: i });
    refresh(i.workspaceId);
    return "Gasto fijo creado";
  });
}

export async function toggleFixedAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, fixedId: id }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "airbnb:manage");
    const f = await prisma.fixedExpense.findFirst({ where: { id: i.fixedId, workspaceId: i.workspaceId } });
    if (!f) throw new Error("NOT_FOUND");
    await prisma.fixedExpense.update({ where: { id: f.id }, data: { active: !f.active } });
    refresh(i.workspaceId);
  });
}

const STEP = { MONTHLY: 1, BIMONTHLY: 2, QUARTERLY: 3, SEMIANNUAL: 6, ANNUAL: 12 } as const;
const LINE = { HOA: "ADMIN", UTILITIES: "UTILITIES", SUBSCRIPTIONS: "SUBSCRIPTIONS", MAINTENANCE: "MAINTENANCE", OTHER: "OTHER_FIXED" } as const;

/** Genera (sin duplicar) los gastos fijos del mes como transacciones POR PAGAR. */
export async function generateFixedAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, month: z.string() }).parse(Object.fromEntries(fd));
    const { userId } = await requireWorkspace(i.workspaceId, "airbnb:manage");
    const { start, end } = monthRange(i.month);
    const [fixed, account, cats, existing] = await Promise.all([
      prisma.fixedExpense.findMany({ where: { workspaceId: i.workspaceId, active: true, startsOn: { lt: end }, OR: [{ endsOn: null }, { endsOn: { gte: start } }] } }),
      prisma.financialAccount.findFirst({ where: { workspaceId: i.workspaceId, archived: false }, orderBy: { createdAt: "asc" } }),
      prisma.category.findMany({ where: { workspaceId: i.workspaceId, expenseKind: "FIXED_OPEX" }, select: { id: true, pygLine: true } }),
      prisma.transaction.findMany({ where: { workspaceId: i.workspaceId, fixedExpenseId: { not: null }, date: { gte: start, lt: end } }, select: { fixedExpenseId: true } }),
    ]);
    if (!account) throw userError("Crea primero una cuenta.");
    const done = new Set(existing.map((e) => e.fixedExpenseId));
    let n = 0;
    for (const f of fixed) {
      const monthsSince = (start.getUTCFullYear() - f.startsOn.getUTCFullYear()) * 12 + (start.getUTCMonth() - f.startsOn.getUTCMonth());
      if (done.has(f.id) || monthsSince < 0 || monthsSince % STEP[f.frequency] !== 0) continue;
      await prisma.transaction.create({
        data: {
          workspaceId: i.workspaceId, type: "EXPENSE", status: "PENDING", amount: f.amount, accountId: account.id, createdById: userId,
          date: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), f.dayOfMonth ?? 1)), vendor: f.name, propertyId: f.propertyId, fixedExpenseId: f.id,
          categoryId: cats.find((c) => c.pygLine === LINE[f.concept])?.id,
        },
      });
      n++;
    }
    refresh(i.workspaceId);
    return n ? `${n} gasto(s) generado(s) como “Por pagar”` : "No había gastos fijos pendientes de generar este mes";
  });
}
