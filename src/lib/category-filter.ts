/** Categorías a dejar fuera de un resumen: ids de categoría o "none" (movimientos sin categoría). */
export type CategoryExclusion = string[] | undefined;
export const parseExclusion = (raw?: string): string[] =>
  [...new Set((raw ?? "").split(",").map((s) => s.trim()).filter((s) => s === "none" || /^c[a-z0-9]{20,30}$/.test(s)))].slice(0, 200);
/** Filtro Prisma que excluye esas categorías (conserva los sin categoría salvo que "none" esté excluido). */
export function categoryFilter(exclude: CategoryExclusion) {
  if (!exclude?.length) return {};
  const ids = exclude.filter((x) => x !== "none");
  if (exclude.includes("none")) return { categoryId: ids.length ? { notIn: ids, not: null } : { not: null } };
  return { OR: [{ categoryId: null }, { categoryId: { notIn: ids } }] };
}
