"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { run, userError, type ActionState } from "@/lib/actions";
import { requireWorkspace } from "@/lib/auth/permissions";
import { todayUtc } from "@/lib/format";
import { rateLimit } from "@/lib/security/rate-limit";
import { id, money, opt, signedMoney } from "@/lib/validation";
import { accountBalances } from "./queries";

const UP = { name: "Ajuste de saldo a favor", emoji: "balance", expenseKind: null } as const;
const DOWN = { name: "Ajuste de saldo en contra", emoji: "balance", expenseKind: "FIXED_OPEX" } as const;

/**
 * Conciliación: iguala el saldo de la app con el saldo real del banco registrando la diferencia como un ajuste
 * (categoría fuera del PyG). Para una tarjeta se escribe la deuda real (positiva) en `realDebt`.
 */
export async function reconcileAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, accountId: id, realBalance: opt(signedMoney), realDebt: opt(money) }).parse(Object.fromEntries(fd));
    const { userId } = await requireWorkspace(i.workspaceId, "dashboard:full");
    rateLimit(`reconcile:${userId}`, 60, 3_600_000);
    const target = i.realDebt !== undefined ? -i.realDebt : i.realBalance;
    if (target === undefined) throw userError("Escribe el saldo real de la cuenta.");
    const acc = (await accountBalances(i.workspaceId, true)).find((a) => a.id === i.accountId);
    if (!acc) throw new Error("NOT_FOUND");
    const diff = Math.round((target - acc.balance) * 100) / 100;
    if (Math.abs(diff) < 0.01) return "Ya cuadra: no hay diferencia.";
    const spec = diff > 0 ? UP : DOWN;
    const cat = (await prisma.category.findFirst({ where: { workspaceId: i.workspaceId, name: spec.name }, select: { id: true } }))
      ?? (await prisma.category.create({ data: { workspaceId: i.workspaceId, name: spec.name, emoji: spec.emoji, expenseKind: spec.expenseKind, pygLine: "NON_OPERATING" }, select: { id: true } }));
    const date = todayUtc();
    await prisma.transaction.create({
      data: {
        workspaceId: i.workspaceId, type: diff > 0 ? "INCOME" : "EXPENSE", status: "PAID", amount: Math.abs(diff), date, paidAt: date,
        accountId: acc.id, categoryId: cat.id, vendor: "Ajuste de saldo", description: `Conciliación: el saldo real era ${target} y la app mostraba ${acc.balance}`, createdById: userId,
      },
    });
    revalidatePath(`/w/${i.workspaceId}`, "layout");
    return `Ajuste de ${Math.abs(diff).toLocaleString("es-CO")} registrado`;
  });
}
