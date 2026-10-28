import type { Prisma } from "@/generated/prisma/client";
import { norm } from "@/lib/csv";
import { prisma } from "@/lib/db";

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

/** Icono con el que se crean las categorías CAPEX habituales cuando una carga las necesita. */
const CAPEX_ICON: Record<string, string> = { Muebles: "chair", "Electrodomésticos": "laundry", Reformas: "build", "Decoración": "gift", "Ropa de cama y cocina": "hotel", "Tecnología": "laptop", Otros: "inventory" };

/** Categorías CAPEX del negocio por nombre normalizado; crea las que falten (las cargas por CSV o lote pueden traer nombres nuevos). */
export async function ensureCapexCategories(workspaceId: string, names: string[]) {
  const existing = await prisma.category.findMany({ where: { workspaceId, expenseKind: "CAPEX", parentId: null }, select: { id: true, name: true } });
  const byNorm = new Map(existing.map((c) => [norm(c.name), c.id]));
  for (const name of new Set(names)) {
    if (byNorm.has(norm(name))) continue;
    const c = await prisma.category.create({ data: { workspaceId, name, emoji: CAPEX_ICON[name] ?? "category", expenseKind: "CAPEX", pygLine: "CAPEX" }, select: { id: true } });
    byNorm.set(norm(name), c.id);
  }
  return byNorm;
}
