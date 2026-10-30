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

/** Un selector de categoría y otro de cuenta (una opción cada uno) expresados como exclusión: se deja fuera todo lo demás. `cat` puede ser "__none" (sin categoría). */
export function exclusionFor(cat: string | undefined, acc: string | undefined, cats: { id: string }[], accs: { id: string }[]): string[] {
  return [
    ...(cat ? [...cats.filter((c) => c.id !== cat).map((c) => c.id), ...(cat === "__none" ? [] : ["none"])] : []),
    ...(acc ? accs.filter((a) => a.id !== acc).map((a) => `a:${a.id}`) : []),
  ];
}
