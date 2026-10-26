const cop0 = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export const cop = (n: number) => cop0.format(n);
export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);
export function monthRange(m?: string) {
  const key = /^\d{4}-(0[1-9]|1[0-2])$/.test(m ?? "") ? (m as string) : monthKey();
  const [y, mo] = key.split("-").map(Number);
  return { key, start: new Date(Date.UTC(y, mo - 1, 1)), end: new Date(Date.UTC(y, mo, 1)) };
}
export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}
export const monthLabel = (key: string) =>
  new Date(`${key}-01T00:00:00Z`).toLocaleDateString("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
export const fmtDate = (d: Date) => d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", timeZone: "UTC" });
export const inputDate = (d: Date) => d.toISOString().slice(0, 10);
export const num = (d: { toString(): string } | null | undefined) => (d == null ? 0 : Number(d.toString()));
/** Fecha dentro de `n` días (aislada para no llamar a Date.now() directamente en componentes). */
export const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000);
export const todayUtc = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

/** Título de un movimiento en listas: la nota (qué se compró) primero, luego el proveedor, luego la categoría. */
export const txTitle = (t: { description?: string | null; vendor?: string | null }, fallback: string, categoryName?: string | null) =>
  t.description?.trim() || t.vendor || categoryName || fallback;
/** Dónde se compró, solo si el título ya es la nota (para no repetirlo). */
export const txVendorHint = (t: { description?: string | null; vendor?: string | null }) => (t.description?.trim() && t.vendor ? t.vendor : null);
