"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { run, userError, type ActionState } from "@/lib/actions";
import { requireWorkspace } from "@/lib/auth/permissions";
import { bool, dateStr, id, intBetween, money, opt, optText, positive } from "@/lib/validation";

const refresh = (w: string) => revalidatePath(`/w/${w}`, "layout");
const CAPEX_CAT = z.enum(["FURNITURE", "APPLIANCES", "RENOVATION", "DECOR", "LINENS_KITCHENWARE", "TECH", "OTHER"]);

async function ownProperty(workspaceId: string, propertyId: string) {
  if (!(await prisma.property.count({ where: { id: propertyId, workspaceId } }))) throw new Error("FORBIDDEN");
}

export async function updatePropertyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, propertyId: id, name: z.string().trim().min(2).max(80), address: optText(160), active: bool }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "airbnb:manage");
    const r = await prisma.property.updateMany({ where: { id: i.propertyId, workspaceId: i.workspaceId }, data: { name: i.name, address: i.address ?? null, active: i.active } });
    if (!r.count) throw new Error("NOT_FOUND");
    refresh(i.workspaceId);
    return "Propiedad actualizada";
  });
}

export async function updateCapexItemAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({
      workspaceId: id, itemId: id, propertyId: id, capexCategory: CAPEX_CAT, itemDescription: z.string().trim().min(2).max(120),
      quantity: intBetween(1, 10_000, "Cantidad"), budgetedUnitPrice: money, store: optText(60),
    }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "airbnb:manage");
    await ownProperty(i.workspaceId, i.propertyId);
    const { itemId, workspaceId, ...data } = i;
    const r = await prisma.capexItem.updateMany({ where: { id: itemId, workspaceId }, data: { ...data, store: i.store ?? null } });
    if (!r.count) throw new Error("NOT_FOUND");
    refresh(workspaceId);
    redirect(`/w/${workspaceId}/capex`);
  });
}

export async function deleteCapexItemAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, itemId: id }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "airbnb:manage");
    await prisma.capexItem.deleteMany({ where: { id: i.itemId, workspaceId: i.workspaceId } });
    refresh(i.workspaceId);
    redirect(`/w/${i.workspaceId}/capex`);
  });
}

export async function updateReservationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({
      workspaceId: id, reservationId: id, propertyId: id, channel: z.enum(["AIRBNB", "BOOKING", "DIRECT", "OTHER"]),
      guestName: optText(80), externalCode: optText(40), checkIn: dateStr, checkOut: dateStr,
      grossAmount: money, cleaningFeeCharged: money, platformCommission: money, payoutStatus: z.enum(["PENDING", "RECEIVED"]),
      status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED"]),
    }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "airbnb:manage");
    await ownProperty(i.workspaceId, i.propertyId);
    if (i.checkOut <= i.checkIn) throw userError("La salida debe ser posterior a la entrada.");
    const { reservationId, workspaceId, ...data } = i;
    try {
      const r = await prisma.reservation.updateMany({
        where: { id: reservationId, workspaceId },
        data: { ...data, guestName: i.guestName ?? null, externalCode: i.externalCode ?? null, payoutDate: i.payoutStatus === "RECEIVED" ? new Date() : null },
      });
      if (!r.count) throw new Error("NOT_FOUND");
    } catch (e) {
      if (e instanceof Error && e.message === "NOT_FOUND") throw e;
      throw userError("Ya existe una reserva con ese código en esta propiedad.");
    }
    refresh(workspaceId);
    redirect(`/w/${workspaceId}/reservations?sel=${reservationId}`);
  });
}

export async function deleteReservationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, reservationId: id }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "airbnb:manage");
    await prisma.reservation.deleteMany({ where: { id: i.reservationId, workspaceId: i.workspaceId } });
    refresh(i.workspaceId);
    redirect(`/w/${i.workspaceId}/reservations`);
  });
}

export async function updateFixedExpenseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({
      workspaceId: id, fixedId: id, propertyId: id, concept: z.enum(["HOA", "UTILITIES", "SUBSCRIPTIONS", "MAINTENANCE", "OTHER"]),
      name: z.string().trim().min(2).max(80), amount: positive, frequency: z.enum(["MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"]),
      dayOfMonth: opt(intBetween(1, 28, "Día del mes")).default(1), active: bool,
    }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "airbnb:manage");
    await ownProperty(i.workspaceId, i.propertyId);
    const { fixedId, workspaceId, ...data } = i;
    const r = await prisma.fixedExpense.updateMany({ where: { id: fixedId, workspaceId }, data });
    if (!r.count) throw new Error("NOT_FOUND");
    refresh(workspaceId);
    redirect(`/w/${workspaceId}/fixed`);
  });
}

export async function deleteFixedExpenseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, fixedId: id }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "airbnb:manage");
    await prisma.fixedExpense.deleteMany({ where: { id: i.fixedId, workspaceId: i.workspaceId } });
    refresh(i.workspaceId);
    redirect(`/w/${i.workspaceId}/fixed`);
  });
}
