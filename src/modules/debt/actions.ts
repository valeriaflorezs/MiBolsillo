"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { run, userError, type ActionState } from "@/lib/actions";
import { requireWorkspace } from "@/lib/auth/permissions";
import { rateLimit } from "@/lib/security/rate-limit";
import { dateStr, id, intBetween, money, opt, optText, percent, positive } from "@/lib/validation";

const optMoney = opt(money);
const loanFields = {
  name: z.string().trim().min(2, "Pon un nombre").max(80),
  lender: optText(80),
  principal: positive,
  rateType: z.enum(["EFFECTIVE_ANNUAL", "MONTHLY"]),
  ratePct: percent(100),
  termMonths: intBetween(1, 600, "Plazo (meses)"),
  firstPaymentDate: dateStr,
  monthlyPayment: optMoney,
  insuranceMonthly: optMoney,
  managementFeeMonthly: optMoney,
  notes: optText(500),
};

// El escritor siempre es ADMIN (dashboard:full); todo ID se verifica contra el workspace (anti-IDOR).
async function ownLoan(workspaceId: string, loanId: string) {
  const loan = await prisma.loan.findFirst({ where: { id: loanId, workspaceId }, select: { id: true } });
  if (!loan) throw new Error("NOT_FOUND");
}
const refresh = (w: string) => revalidatePath(`/w/${w}/accounts`);

export async function createLoanAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, ...loanFields }).parse(Object.fromEntries(fd));
    const { userId } = await requireWorkspace(i.workspaceId, "dashboard:full");
    rateLimit(`loan:${userId}`, 30, 3_600_000);
    if ((await prisma.loan.count({ where: { workspaceId: i.workspaceId } })) >= 20) throw userError("Alcanzaste el máximo de créditos.");
    const loan = await prisma.loan.create({ data: i, select: { id: true } });
    redirect(`/w/${i.workspaceId}/accounts?t=creditos&l=${loan.id}`);
  });
}

export async function updateLoanAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { workspaceId, loanId, ...data } = z.object({ workspaceId: id, loanId: id, ...loanFields }).parse(Object.fromEntries(fd));
    await requireWorkspace(workspaceId, "dashboard:full");
    await ownLoan(workspaceId, loanId);
    await prisma.loan.update({ where: { id: loanId }, data: { ...data, monthlyPayment: data.monthlyPayment ?? null, insuranceMonthly: data.insuranceMonthly ?? null, managementFeeMonthly: data.managementFeeMonthly ?? null } });
    refresh(workspaceId);
    return "Crédito actualizado";
  });
}

export async function deleteLoanAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, loanId: id }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "dashboard:full");
    await ownLoan(i.workspaceId, i.loanId);
    await prisma.loan.delete({ where: { id: i.loanId } });
    redirect(`/w/${i.workspaceId}/accounts?t=creditos`);
  });
}

export async function addPaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({
      workspaceId: id, loanId: id, date: dateStr, kind: z.enum(["INSTALLMENT", "EXTRA"]),
      amount: positive, interestOverride: optMoney, fees: optMoney, note: optText(200),
    }).parse(Object.fromEntries(fd));
    const { userId } = await requireWorkspace(i.workspaceId, "dashboard:full");
    rateLimit(`loanpay:${userId}`, 120, 3_600_000);
    await ownLoan(i.workspaceId, i.loanId);
    const fees = i.kind === "EXTRA" ? undefined : i.fees; // un abono extra a capital no paga seguro ni manejo
    if ((i.interestOverride ?? 0) + (fees ?? 0) > i.amount) throw userError("Intereses más seguro y manejo no pueden superar el pago.");
    await prisma.loanPayment.create({ data: { ...i, interestOverride: i.interestOverride ?? null, fees: fees ?? null } });
    refresh(i.workspaceId);
    return "Pago registrado";
  });
}

export async function deletePaymentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, paymentId: id }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "dashboard:full");
    const r = await prisma.loanPayment.deleteMany({ where: { id: i.paymentId, workspaceId: i.workspaceId } });
    if (!r.count) throw new Error("NOT_FOUND");
    refresh(i.workspaceId);
  });
}

export async function addAllocationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, loanId: id, category: optText(60), name: z.string().trim().min(2, "Pon el concepto").max(100), amount: money }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "dashboard:full");
    await ownLoan(i.workspaceId, i.loanId);
    await prisma.loanAllocation.create({ data: { ...i, sortOrder: await prisma.loanAllocation.count({ where: { loanId: i.loanId } }) } });
    refresh(i.workspaceId);
    return "Destino agregado";
  });
}

export async function deleteAllocationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, allocationId: id }).parse(Object.fromEntries(fd));
    await requireWorkspace(i.workspaceId, "dashboard:full");
    const r = await prisma.loanAllocation.deleteMany({ where: { id: i.allocationId, workspaceId: i.workspaceId } });
    if (!r.count) throw new Error("NOT_FOUND");
    refresh(i.workspaceId);
  });
}
