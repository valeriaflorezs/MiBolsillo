"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { run, userError, type ActionState } from "@/lib/actions";
import { requireWorkspace } from "@/lib/auth/permissions";
import { monthRange } from "@/lib/format";

const id = z.string().cuid();
const money = z.coerce.number({ message: "Monto inválido" }).min(0, "No puede ser negativo").max(1e12);
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").transform((s) => new Date(`${s}T00:00:00Z`));
const optText = (n: number) => z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(n).optional());
const refresh = (w: string) => revalidatePath(`/w/${w}`, "layout");

async function ownProperty(workspaceId: string, propertyId: string) {
  if (!(await prisma.property.count({ where: { id: propertyId, workspaceId } }))) throw new Error("FORBIDDEN");
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
      capexCategory: z.enum(["FURNITURE", "APPLIANCES", "RENOVATION", "DECOR", "LINENS_KITCHENWARE", "TECH", "OTHER"]),
      itemDescription: z.string().trim().min(2, "Describe el ítem").max(120),
      quantity: z.coerce.number().int().min(1).max(10_000), budgetedUnitPrice: money, store: optText(60),
    }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "airbnb:manage");
    await ownProperty(i.workspaceId, i.propertyId);
    await prisma.capexItem.create({ data: i });
    refresh(i.workspaceId);
    return "Ítem agregado";
  });
}

/** Marca comprado (con precio real) o deshace la compra. Permitido al OPERATOR. */
export async function updateCapexAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({
      workspaceId: id, itemId: id, intent: z.enum(["buy", "undo"]),
      actualUnitPrice: z.preprocess((v) => (v === "" ? undefined : v), money.optional()),
    }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "capex:update");
    const item = await prisma.capexItem.findFirst({ where: { id: i.itemId, workspaceId: i.workspaceId } });
    if (!item) throw new Error("NOT_FOUND");
    if (i.intent === "buy") {
      await prisma.capexItem.update({
        where: { id: item.id },
        data: { status: "PURCHASED", purchasedAt: new Date(), actualUnitPrice: i.actualUnitPrice ?? item.budgetedUnitPrice },
      });
    } else {
      await prisma.capexItem.update({ where: { id: item.id }, data: { status: "PENDING", purchasedAt: null, actualUnitPrice: null } });
    }
    refresh(i.workspaceId);
  });
}

export async function createReservationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({
      workspaceId: id, propertyId: id, channel: z.enum(["AIRBNB", "BOOKING", "DIRECT", "OTHER"]),
      guestName: optText(80), externalCode: optText(40), checkIn: dateStr, checkOut: dateStr,
      grossAmount: money, cleaningFeeCharged: money, platformCommission: money, payoutStatus: z.enum(["PENDING", "RECEIVED"]),
    }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "airbnb:manage");
    await ownProperty(i.workspaceId, i.propertyId);
    if (i.checkOut <= i.checkIn) throw userError("La salida debe ser posterior a la entrada.");
    try {
      await prisma.reservation.create({ data: { ...i, payoutDate: i.payoutStatus === "RECEIVED" ? new Date() : null } });
    } catch {
      throw userError("Ya existe una reserva con ese código en esta propiedad.");
    }
    refresh(i.workspaceId);
    return "Reserva guardada";
  });
}

export async function reservationStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, reservationId: id, intent: z.enum(["received", "cancel"]) }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "airbnb:manage");
    const r = await prisma.reservation.updateMany({
      where: { id: i.reservationId, workspaceId: i.workspaceId },
      data: i.intent === "received" ? { payoutStatus: "RECEIVED", payoutDate: new Date() } : { status: "CANCELLED" },
    });
    if (!r.count) throw new Error("NOT_FOUND");
    refresh(i.workspaceId);
  });
}

export async function createFixedExpenseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({
      workspaceId: id, propertyId: id, concept: z.enum(["HOA", "UTILITIES", "SUBSCRIPTIONS", "MAINTENANCE", "OTHER"]),
      name: z.string().trim().min(2).max(80), amount: money.refine((n) => n > 0, "Monto inválido"),
      frequency: z.enum(["MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"]),
      dayOfMonth: z.coerce.number().int().min(1).max(28).default(1),
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
