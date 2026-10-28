// Rangos de fechas del panel de administración. Se interpretan en hora de Colombia (UTC-5, sin horario de verano).
const TZ = "America/Bogota";
const OFFSET = "-05:00";
export type RangeKey = "hoy" | "7d" | "mes" | "todo";

const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const valid = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) ? s : undefined);
const addDays = (s: string, n: number) => new Date(Date.parse(`${s}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Rango efectivo a partir de los filtros: atajo (`rango`) o fechas `desde`/`hasta`; por omisión, últimos 7 días. */
export function resolveRange(sp: { rango?: string; desde?: string; hasta?: string }, now = new Date()) {
  const today = ymd(now);
  let desde = valid(sp.desde), hasta = valid(sp.hasta), key: RangeKey | "custom" = "custom";
  if (!desde && !hasta) {
    key = sp.rango === "hoy" || sp.rango === "mes" || sp.rango === "todo" ? sp.rango : "7d";
    if (key === "hoy") desde = hasta = today;
    else if (key === "mes") { desde = `${today.slice(0, 7)}-01`; hasta = today; }
    else if (key === "7d") { desde = addDays(today, -6); hasta = today; }
  }
  const from = desde ? new Date(`${desde}T00:00:00.000${OFFSET}`) : undefined;
  const to = hasta ? new Date(`${hasta}T23:59:59.999${OFFSET}`) : undefined;
  return { key, desde, hasta, from, to, where: from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined };
}

export const fmtDateTime = (d: Date) => d.toLocaleString("es-CO", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
