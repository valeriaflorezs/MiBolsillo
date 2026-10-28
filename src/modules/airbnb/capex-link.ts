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

/**
 * Recalcula un ítem CAPEX desde los gastos vinculados: con al menos uno queda comprado, con el total pagado repartido
 * por la cantidad como precio real, la fecha del último gasto y las tiendas (proveedores) de todos; sin ninguno vuelve a pendiente.
 */
export async function syncCapexPurchase(tx: Tx, itemId: string) {
  const item = await tx.capexItem.findUnique({ where: { id: itemId }, select: { quantity: true, store: true } });
  if (!item) return;
  const linked = await tx.transaction.findMany({ where: { capexItemId: itemId, type: "EXPENSE" }, select: { amount: true, date: true, vendor: true }, orderBy: { date: "asc" } });
  if (!linked.length) {
    await tx.capexItem.update({ where: { id: itemId }, data: { status: "PENDING", purchasedAt: null, actualUnitPrice: null } });
    return;
  }
  const total = linked.reduce((a, t) => a + Number(t.amount), 0);
  const vendors = [...new Set(linked.map((t) => t.vendor?.trim()).filter((v): v is string => !!v))];
  await tx.capexItem.update({
    where: { id: itemId },
    data: {
      status: "PURCHASED", purchasedAt: linked[linked.length - 1].date, actualUnitPrice: Math.round((total / item.quantity) * 100) / 100,
      ...(vendors.length ? { store: vendors.join(", ").slice(0, 120) } : {}),
    },
  });
}
