import type { Prisma, WorkspaceType } from "@/generated/prisma/client";
import { DEFAULT_CATEGORIES, FINANCIAL_CATEGORIES } from "./defaults";

/** Crea un negocio con su administrador, categorías por defecto, cuenta de efectivo y (en Airbnb) la primera propiedad. */
export async function provisionWorkspace(tx: Prisma.TransactionClient, input: { name: string; type: WorkspaceType; adminUserId: string; propertyName?: string }) {
  const w = await tx.workspace.create({ data: { name: input.name, type: input.type, members: { create: { userId: input.adminUserId, role: "ADMIN" } } } });
  await tx.category.createMany({
    data: [...DEFAULT_CATEGORIES[input.type], ...FINANCIAL_CATEGORIES].map((c) => ({
      workspaceId: w.id,
      name: c.name,
      emoji: c.emoji,
      expenseKind: c.income ? null : c.kind,
      pygLine: c.pygLine,
    })),
  });
  await tx.financialAccount.create({ data: { workspaceId: w.id, name: "Efectivo", type: "CASH", emoji: "payments" } });
  if (input.type === "AIRBNB") await tx.property.create({ data: { workspaceId: w.id, name: input.propertyName || input.name } });
  return w;
}
