import { z } from "zod";
import { prisma } from "@/lib/db";
import { norm, parseMoney, toObjects, parseCsv } from "@/lib/csv";
import type { CapexCategory, FixedExpenseConcept, Frequency, Prisma } from "@/generated/prisma/client";

const MAX_ROWS = 500;
export type ImportResult = { created: number; skipped: number; errors: string[] };
/** `row` = índice (desde 0) de la fila de datos, sin contar el encabezado. */
export type RowIssue = { row: number; msg: string };
export type Parsed<T> = { data: T[]; skipped: number; errors: RowIssue[]; warnings: RowIssue[] };
type Obj = Record<string, string>;

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

/** Deduce la categoría de CAPEX por palabras del ítem (para hojas de Excel que usan otras categorías). */
const INFER: [RegExp, CapexCategory][] = [
  [/nevera|lavadora|secadora de ropa|freidora|cafetera|microhond|licuadora|secador|aire acond|estufa|horno|ventilador|plancha|hervidor|tostadora/, "APPLIANCES"],
  [/\btv\b|televis|router|camara|parlante|telefono|computador|tablet/, "TECH"],
  [/toalla|protector|sabana|almohada|cobija|edredon|vaso|pocillo|plato|vajilla|cubierto|cuchillo|olla|sarten|menaje|bateria/, "LINENS_KITCHENWARE"],
  [/cama|colchon|comedor|sofa|butaca|mesedora|silla|mesa|escritorio|closet|armario|nochero|estante|mueble de sala/, "FURNITURE"],
  [/persiana|cortina|cuadro|espejo|lampara|tapete|planta|decor/, "DECOR"],
  [/puerta|grifo|lavamanos|lavaplatos|sifon|arreglo|pintura|piso|mudanza|instalaci|ducha|sanitario|cocina|bano|patio|reforma|remodel/, "RENOVATION"],
];
export const inferCapexCategory = (desc: string): CapexCategory | undefined => {
  const n = desc.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return INFER.find(([re]) => re.test(n))?.[1];
};

type CapexOpts = { lenientCategory?: boolean };
/** Columnas: categoria, descripcion, cantidad, precio_unitario_presupuestado, precio_unitario_real (opcional), tienda (opcional). Con precio real → comprado. */
export function parseCapex(objs: Obj[], existing: Set<string>, opts: CapexOpts = {}): Parsed<Omit<Prisma.CapexItemCreateManyInput, "workspaceId" | "propertyId">> {
  const out: Parsed<Omit<Prisma.CapexItemCreateManyInput, "workspaceId" | "propertyId">> = { data: [], skipped: 0, errors: [], warnings: [] };
  const seen = new Set(existing);
  objs.forEach((o, row) => {
    const desc = z.string().trim().min(2).max(120).safeParse(o.descripcion ?? o.item ?? "");
    let cat = CAPEX[norm(o.categoria ?? "")] ?? (o.categoria ? undefined : "OTHER");
    const qty = o.cantidad ? Number(o.cantidad.replace(",", ".")) : 1;
    const budget = money(o.precio_unitario_presupuestado ?? o.presupuesto);
    const actual = money(o.precio_unitario_real ?? o.real);
    if (!desc.success) return out.errors.push({ row, msg: "falta la descripción." });
    if (!cat && opts.lenientCategory) {
      cat = inferCapexCategory(desc.data) ?? "OTHER";
      out.warnings.push({ row, msg: `categoría “${o.categoria}” no reconocida; se usará ${CAPEX_LABEL[cat]}.` });
    }
    if (!cat) return out.errors.push({ row, msg: `categoría “${o.categoria}” no reconocida.` });
    if (!Number.isInteger(qty) || qty < 1 || qty > 10_000) return out.errors.push({ row, msg: "cantidad inválida." });
    if (budget === undefined || !Number.isFinite(budget) || budget < 0) return out.errors.push({ row, msg: "precio presupuestado inválido." });
    if (actual !== undefined && (!Number.isFinite(actual) || actual < 0)) return out.errors.push({ row, msg: "precio real inválido." });
    if (seen.has(norm(desc.data))) { out.skipped++; return; } // idempotente: no duplica ítems ya cargados
    seen.add(norm(desc.data));
    const bought = actual !== undefined && actual > 0;
    out.data.push({ capexCategory: cat, itemDescription: desc.data, quantity: qty, budgetedUnitPrice: budget, actualUnitPrice: bought ? actual : null, status: bought ? "PURCHASED" : "PENDING", store: o.tienda || null });
  });
  return out;
}
const CAPEX_LABEL: Record<CapexCategory, string> = { FURNITURE: "Muebles", APPLIANCES: "Electrodomésticos", RENOVATION: "Reformas", DECOR: "Decoración", LINENS_KITCHENWARE: "Ropa de cama y cocina", TECH: "Tecnología", OTHER: "Otros" };

/** Columnas: nombre, concepto, monto, frecuencia (opcional, mensual por defecto), dia (opcional). */
export function parseFixed(objs: Obj[], existing: Set<string>): Parsed<Omit<Prisma.FixedExpenseCreateManyInput, "workspaceId" | "propertyId">> {
  const out: Parsed<Omit<Prisma.FixedExpenseCreateManyInput, "workspaceId" | "propertyId">> = { data: [], skipped: 0, errors: [], warnings: [] };
  const seen = new Set(existing);
  objs.forEach((o, row) => {
    const name = z.string().trim().min(2).max(80).safeParse(o.nombre ?? "");
    const concept = CONCEPT[norm(o.concepto || "otro")];
    const freq = FREQ[norm(o.frecuencia || "mensual")];
    const amount = money(o.monto);
    const day = o.dia ? Number(o.dia) : 1;
    if (!name.success) return out.errors.push({ row, msg: "falta el nombre." });
    if (!concept) return out.errors.push({ row, msg: `concepto “${o.concepto}” no reconocido.` });
    if (!freq) return out.errors.push({ row, msg: `frecuencia “${o.frecuencia}” no reconocida.` });
    if (amount === undefined || !Number.isFinite(amount) || amount <= 0) return out.errors.push({ row, msg: "monto inválido." });
    if (!Number.isInteger(day) || day < 1 || day > 28) return out.errors.push({ row, msg: "día inválido (1–28)." });
    if (seen.has(norm(name.data))) { out.skipped++; return; }
    seen.add(norm(name.data));
    out.data.push({ name: name.data, concept, amount, frequency: freq, dayOfMonth: day });
  });
  return out;
}

/** Columnas: categoria (opcional), concepto, valor. Destino de los fondos de un crédito. */
export function parseAllocations(objs: Obj[], existing: Set<string>): Parsed<{ category: string | null; name: string; amount: number }> {
  const out: Parsed<{ category: string | null; name: string; amount: number }> = { data: [], skipped: 0, errors: [], warnings: [] };
  const seen = new Set(existing);
  objs.forEach((o, row) => {
    const name = z.string().trim().min(2).max(100).safeParse(o.concepto ?? "");
    const amount = money(o.valor);
    if (!name.success) return out.errors.push({ row, msg: "falta el concepto." });
    if (/^monto total/.test(norm(name.data).replace(/_/g, " "))) { out.skipped++; out.warnings.push({ row, msg: "es el monto total del crédito, no un destino: se omite." }); return; }
    if (amount === undefined || !Number.isFinite(amount) || amount < 0 || amount > 1e12) return out.errors.push({ row, msg: "valor inválido." });
    if ((o.categoria ?? "").length > 60) return out.errors.push({ row, msg: "categoría demasiado larga." });
    if (seen.has(norm(name.data))) { out.skipped++; return; }
    seen.add(norm(name.data));
    out.data.push({ category: o.categoria || null, name: name.data, amount });
  });
  return out;
}

const TYPE: Record<string, "EXPENSE" | "INCOME"> = { gasto: "EXPENSE", egreso: "EXPENSE", expense: "EXPENSE", ingreso: "INCOME", income: "INCOME" };
const STATUS: Record<string, "PAID" | "PENDING"> = { pagado: "PAID", cobrado: "PAID", paid: "PAID", pendiente: "PENDING", por_pagar: "PENDING", por_cobrar: "PENDING", pending: "PENDING" };

/** "2026-03-15", "15/03/2026", "15-03-26" (día primero, como en Colombia) → Date UTC. */
export function parseDate(raw: string): Date | null {
  const s = raw.trim();
  let y: number, m: number, d: number;
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (r) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s))) [d, m, y] = [+r[1], +r[2], +r[3] < 100 ? 2000 + +r[3] : +r[3]];
  else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y >= 2000 && y <= 2100 ? dt : null;
}

export type TxLookups = { accounts: { id: string; name: string }[]; categories: { id: string; name: string }[] };
/** Columnas: fecha, tipo (gasto/ingreso), monto, proveedor, descripcion, categoria, cuenta, estado (pagado/pendiente). */
export function parseTransactions(objs: Obj[], lk: TxLookups): Parsed<{ type: "EXPENSE" | "INCOME"; status: "PAID" | "PENDING"; amount: number; date: Date; accountId: string; categoryId: string | null; vendor: string | null; description: string | null }> {
  const out: ReturnType<typeof parseTransactions> = { data: [], skipped: 0, errors: [], warnings: [] };
  const acc = new Map(lk.accounts.map((a) => [norm(a.name), a.id]));
  const cat = new Map(lk.categories.map((c) => [norm(c.name.replace(/^\p{Extended_Pictographic}\s*/u, "")), c.id]));
  objs.forEach((o, row) => {
    const date = parseDate(o.fecha ?? "");
    const type = TYPE[norm(o.tipo || "gasto")];
    const amount = money(o.monto);
    const status = STATUS[norm(o.estado || "pagado")];
    const accountId = o.cuenta ? acc.get(norm(o.cuenta)) : lk.accounts.length === 1 ? lk.accounts[0].id : undefined;
    const categoryId = o.categoria ? cat.get(norm(o.categoria.replace(/^\p{Extended_Pictographic}\s*/u, ""))) : null;
    if (!date) return out.errors.push({ row, msg: "fecha inválida (usa AAAA-MM-DD o DD/MM/AAAA)." });
    if (!type) return out.errors.push({ row, msg: `tipo “${o.tipo}” no reconocido (Gasto o Ingreso).` });
    if (amount === undefined || !Number.isFinite(amount) || amount <= 0 || amount > 1e12) return out.errors.push({ row, msg: "monto inválido (positivo; el tipo define si es gasto o ingreso)." });
    if (!status) return out.errors.push({ row, msg: `estado “${o.estado}” no reconocido (Pagado o Pendiente).` });
    if (!accountId) return out.errors.push({ row, msg: o.cuenta ? `cuenta “${o.cuenta}” no existe.` : "falta la cuenta." });
    if (o.categoria && !categoryId) return out.errors.push({ row, msg: `categoría “${o.categoria}” no existe.` });
    if ((o.proveedor ?? "").length > 80 || (o.descripcion ?? "").length > 300) return out.errors.push({ row, msg: "texto demasiado largo." });
    out.data.push({ type, status, amount, date, accountId, categoryId: categoryId ?? null, vendor: o.proveedor || null, description: o.descripcion || null });
  });
  return out;
}

function issues(label: string, list: RowIssue[], offset: number) {
  return list.map((e) => `${label} ${e.row + offset}: ${e.msg}`);
}

export async function importCapex(workspaceId: string, propertyId: string, text: string): Promise<ImportResult> {
  const objs = rowsOf(text);
  const existing = new Set((await prisma.capexItem.findMany({ where: { workspaceId, propertyId }, select: { itemDescription: true } })).map((i) => norm(i.itemDescription)));
  const p = parseCapex(objs, existing);
  if (p.data.length) await prisma.capexItem.createMany({ data: p.data.map((d) => ({ ...d, workspaceId, propertyId })) });
  return { created: p.data.length, skipped: p.skipped, errors: issues("Fila", p.errors, 2) };
}

export async function importFixed(workspaceId: string, propertyId: string, text: string): Promise<ImportResult> {
  const objs = rowsOf(text);
  const existing = new Set((await prisma.fixedExpense.findMany({ where: { workspaceId, propertyId }, select: { name: true } })).map((i) => norm(i.name)));
  const p = parseFixed(objs, existing);
  if (p.data.length) await prisma.fixedExpense.createMany({ data: p.data.map((d) => ({ ...d, workspaceId, propertyId })) });
  return { created: p.data.length, skipped: p.skipped, errors: issues("Fila", p.errors, 2) };
}
