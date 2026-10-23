import { z } from "zod";

export const id = z.string().cuid();
export const money = z.coerce.number({ message: "Monto inválido" }).min(0, "No puede ser negativo").max(1e12);
export const positive = money.refine((n) => n > 0, "Debe ser mayor a 0");
export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").transform((s) => new Date(`${s}T00:00:00Z`));
export const optText = (n: number) => z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(n).optional());
export const optId = z.preprocess((v) => (v === "" ? undefined : v), id.optional());
export const bool = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
