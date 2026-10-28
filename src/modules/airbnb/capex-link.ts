import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/** Categoría para el gasto de un ítem CAPEX: la del ítem si es de tipo CAPEX, si no la primera categoría CAPEX del workspace. */
export async function capexCategoryFor(tx: Tx, workspaceId: string, itemCategoryId: string | null) {
  if (itemCategoryId) {
    const c = await tx.category.findFirst({ where: { id: itemCategoryId, workspaceId, expenseKind: "CAPEX" }, select: { id: true } });
    if (c) return c.id;
  }
  const c = await tx.category.findFirst({ where: { workspaceId, expenseKind: "CAPEX", archived: false }, orderBy: { name: "asc" }, select: { id: true } });
  return c?.id ?? null;
}

/** Cierra un ítem CAPEX con el valor total realmente pagado: queda comprado y su precio real sale de ese monto (sin digitarlo dos veces). */
export async function markCapexPurchased(tx: Tx, itemId: string, totalPaid: number, quantity: number, date: Date) {
  await tx.capexItem.update({
    where: { id: itemId },
    data: { status: "PURCHASED", purchasedAt: date, actualUnitPrice: Math.round((totalPaid / quantity) * 100) / 100 },
  });
}
