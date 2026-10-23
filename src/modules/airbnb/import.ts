import { z } from "zod";
import { prisma } from "@/lib/db";
import { norm, parseMoney, toObjects, parseCsv } from "@/lib/csv";
import type { CapexCategory, FixedExpenseConcept, Frequency, Prisma } from "@/generated/prisma/client";

const MAX_ROWS = 500;
export type ImportResult = { created: number; skipped: number; errors: string[] };

const CAPEX: Record<string, CapexCategory> = {
  furniture: "FURNITURE", muebles: "FURNITURE", mueble: "FURNITURE",
  appliances: "APPLIANCES", electrodomesticos: "APPLIANCES", electrodomestico: "APPLIANCES",
  renovation: "RENOVATION", reformas: "RENOVATION", reforma: "RENOVATION", remodelacion: "RENOVATION",
  decor: "DECOR", decoracion: "DECOR",
  linens_kitchenware: "LINENS_KITCHENWARE", ropa_de_cama_y_cocina: "LINENS_KITCHENWARE", menaje: "LINENS_KITCHENWARE", cocina: "LINENS_KITCHENWARE",
  tech: "TECH", tecnologia: "TECH", otros: "OTHER", otro: "OTHER", other: "OTHER",
};
const CONCEPT: Record<string, FixedExpenseConcept> = {
  hoa: "HOA", administracion: "HOA", utilities: "UTILITIES", servicios: "UTILITIES", servicios_publicos: "UTILITIES",
  subscriptions: "SUBSCRIPTIONS", suscripciones: "SUBSCRIPTIONS", mantenimiento: "MAINTENANCE", maintenance: "MAINTENANCE", otro: "OTHER", otros: "OTHER", other: "OTHER",
};
const FREQ: Record<string, Frequency> = {
  mensual: "MONTHLY", monthly: "MONTHLY", bimestral: "BIMONTHLY", trimestral: "QUARTERLY", semestral: "SEMIANNUAL", anual: "ANNUAL",
  bimonthly: "BIMONTHLY", quarterly: "QUARTERLY", semiannual: "SEMIANNUAL", annual: "ANNUAL",
};

const money = (v: string | undefined) => (v && v.trim() ? parseMoney(v) : undefined);

function rowsOf(text: string) {
  const objs = toObjects(parseCsv(text));
  if (objs.length === 0) throw new Error("USER:El archivo está vacío o no tiene encabezados.");
  if (objs.length > MAX_ROWS) throw new Error(`USER:Máximo ${MAX_ROWS} filas por archivo.`);
  return objs;
}

/** Columnas: categoria, descripcion, cantidad, precio_unitario_presupuestado, precio_unitario_real (opcional), tienda (opcional). Con precio real → comprado. */
export async function importCapex(workspaceId: string, propertyId: string, text: string): Promise<ImportResult> {
  const objs = rowsOf(text);
  const existing = new Set((await prisma.capexItem.findMany({ where: { workspaceId, propertyId }, select: { itemDescription: true } })).map((i) => norm(i.itemDescription)));
  const res: ImportResult = { created: 0, skipped: 0, errors: [] };
  const data: Prisma.CapexItemCreateManyInput[] = [];
  objs.forEach((o, idx) => {
    const line = idx + 2;
    const desc = z.string().trim().min(2).max(120).safeParse(o.descripcion ?? o.item ?? "");
    const cat = CAPEX[norm(o.categoria ?? "")] ?? (o.categoria ? undefined : "OTHER");
    const qty = o.cantidad ? Number(o.cantidad.replace(",", ".")) : 1;
    const budget = money(o.precio_unitario_presupuestado ?? o.presupuesto);
    const actual = money(o.precio_unitario_real ?? o.real);
    if (!desc.success) return res.errors.push(`Fila ${line}: falta la descripción.`);
    if (!cat) return res.errors.push(`Fila ${line}: categoría “${o.categoria}” no reconocida.`);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10_000) return res.errors.push(`Fila ${line}: cantidad inválida.`);
    if (budget === undefined || !Number.isFinite(budget) || budget < 0) return res.errors.push(`Fila ${line}: precio presupuestado inválido.`);
    if (actual !== undefined && (!Number.isFinite(actual) || actual < 0)) return res.errors.push(`Fila ${line}: precio real inválido.`);
    if (existing.has(norm(desc.data))) { res.skipped++; return; } // idempotente: no duplica ítems ya cargados
    existing.add(norm(desc.data));
    const bought = actual !== undefined && actual > 0;
    data.push({
      workspaceId, propertyId, capexCategory: cat, itemDescription: desc.data, quantity: qty, budgetedUnitPrice: budget,
      actualUnitPrice: bought ? actual : null, status: bought ? "PURCHASED" : "PENDING", store: o.tienda || null,
    });
  });
  if (data.length) await prisma.capexItem.createMany({ data });
  res.created = data.length;
  return res;
}

/** Columnas: nombre, concepto, monto, frecuencia (opcional, mensual por defecto), dia (opcional). */
export async function importFixed(workspaceId: string, propertyId: string, text: string): Promise<ImportResult> {
  const objs = rowsOf(text);
  const existing = new Set((await prisma.fixedExpense.findMany({ where: { workspaceId, propertyId }, select: { name: true } })).map((i) => norm(i.name)));
  const res: ImportResult = { created: 0, skipped: 0, errors: [] };
  const data: Prisma.FixedExpenseCreateManyInput[] = [];
  objs.forEach((o, idx) => {
    const line = idx + 2;
    const name = z.string().trim().min(2).max(80).safeParse(o.nombre ?? "");
    const concept = CONCEPT[norm(o.concepto ?? "otro")];
    const freq = FREQ[norm(o.frecuencia || "mensual")];
    const amount = money(o.monto);
    const day = o.dia ? Number(o.dia) : 1;
    if (!name.success) return res.errors.push(`Fila ${line}: falta el nombre.`);
    if (!concept) return res.errors.push(`Fila ${line}: concepto “${o.concepto}” no reconocido.`);
    if (!freq) return res.errors.push(`Fila ${line}: frecuencia “${o.frecuencia}” no reconocida.`);
    if (amount === undefined || !Number.isFinite(amount) || amount <= 0) return res.errors.push(`Fila ${line}: monto inválido.`);
    if (!Number.isInteger(day) || day < 1 || day > 28) return res.errors.push(`Fila ${line}: día inválido (1–28).`);
    if (existing.has(norm(name.data))) { res.skipped++; return; }
    existing.add(norm(name.data));
    data.push({ workspaceId, propertyId, name: name.data, concept, amount, frequency: freq, dayOfMonth: day });
  });
  if (data.length) await prisma.fixedExpense.createMany({ data });
  res.created = data.length;
  return res;
}
