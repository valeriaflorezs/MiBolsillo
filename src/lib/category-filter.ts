/** Qué dejar fuera de un resumen: ids de categoría, "none" (movimientos sin categoría) o "a:<id>" (una cuenta). */
export type CategoryExclusion = string[] | undefined;
const CUID = "c[a-z0-9]{20,30}";
const VALID = new RegExp(`^(none|${CUID}|a:${CUID})$`);
export const parseExclusion = (raw?: string): string[] =>
  [...new Set((raw ?? "").split(",").map((s) => s.trim()).filter((s) => VALID.test(s)))].slice(0, 200);

/** Filtro Prisma que excluye esas categorías (conserva los sin categoría salvo que "none" esté excluido) y esas cuentas. */
export function categoryFilter(exclude: CategoryExclusion) {
  if (!exclude?.length) return {};
  const accounts = exclude.filter((x) => x.startsWith("a:")).map((x) => x.slice(2));
  const ids = exclude.filter((x) => x !== "none" && !x.startsWith("a:"));
  const none = exclude.includes("none");
  const byCategory = none
    ? { categoryId: ids.length ? { notIn: ids, not: null } : { not: null } }
    : ids.length ? { OR: [{ categoryId: null }, { categoryId: { notIn: ids } }] } : {};
  if (!accounts.length) return byCategory;
  const byAccount = { accountId: { notIn: accounts } };
  return Object.keys(byCategory).length ? { AND: [byCategory, byAccount] } : byAccount;
}
