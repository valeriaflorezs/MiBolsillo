import { z } from "zod";

/**
 * Números estrictos: solo dígitos con un punto o coma decimal. Rechaza vacío, espacios, notación científica
 * ("1e3"), hexadecimal ("0x10"), texto mezclado ("12abc") y separadores de miles ("1.500.000").
 * (`z.coerce.number()` aceptaba todo eso: "" → 0, "1e3" → 1000, "0x10" → 16.)
 */
const PLAIN = /^-?\d+(?:[.,]\d+)?$/;
export function numericInput(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  const s = v.trim();
  return PLAIN.test(s) ? Number(s.replace(",", ".")) : NaN;
}
const decimals = (max: number) => (n: number) => Math.abs(n * 10 ** max - Math.round(n * 10 ** max)) < 1e-6;
const strict = <T extends z.ZodType>(schema: T) => z.preprocess(numericInput, schema);
/** "" o ausente → undefined (campo opcional). */
export const opt = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());

const MONEY_MSG = "Monto inválido: escribe solo números, sin puntos de miles (ej. 1500000)";
export const id = z.string().cuid();
/** Dinero ≥ 0, hasta 2 decimales. */
export const money = strict(z.number({ message: MONEY_MSG }).min(0, "No puede ser negativo").max(1e12, "El monto es demasiado grande").refine(decimals(2), "Máximo 2 decimales"));
/** Dinero > 0. */
export const positive = strict(z.number({ message: MONEY_MSG }).positive("Debe ser mayor a 0").max(1e12, "El monto es demasiado grande").refine(decimals(2), "Máximo 2 decimales"));
/** Dinero con signo (saldos iniciales). */
export const signedMoney = strict(z.number({ message: MONEY_MSG }).min(-1e12, "El monto es demasiado grande").max(1e12, "El monto es demasiado grande").refine(decimals(2), "Máximo 2 decimales"));
/** Cantidad de unidades > 0, hasta 3 decimales (kg, litros…). */
export const quantity = strict(z.number({ message: "Cantidad inválida: escribe solo números (ej. 2 o 1.5)" }).positive("La cantidad debe ser mayor a 0").max(1e7, "La cantidad es demasiado grande").refine(decimals(3), "Máximo 3 decimales"));
/** Entero entre `min` y `max`. */
export const intBetween = (min: number, max: number, label: string) =>
  strict(z.number({ message: `${label}: escribe un número entero` }).int(`${label}: debe ser un número entero`).min(min, `${label}: mínimo ${min}`).max(max, `${label}: máximo ${max}`));
/** Porcentaje entre 0 y `max`, hasta 4 decimales. */
export const percent = (max: number, label = "Tasa") =>
  strict(z.number({ message: `${label} inválida: escribe solo números (ej. 24 o 1.8)` }).min(0, `${label}: no puede ser negativa`).max(max, `${label}: parece demasiado alta`).refine(decimals(4), "Máximo 4 decimales"));

/** Fecha AAAA-MM-DD que existe de verdad (rechaza 2026-02-31) y razonable (2000–2100). */
export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .refine((s) => { const d = new Date(`${s}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100; }, "Fecha inválida")
  .transform((s) => new Date(`${s}T00:00:00Z`));
export const optText = (n: number) => z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(n, `Máximo ${n} caracteres`).optional());
export const optId = z.preprocess((v) => (v === "" ? undefined : v), id.optional());
export const bool = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
