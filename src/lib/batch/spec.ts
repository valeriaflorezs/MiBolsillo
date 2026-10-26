import { norm, parseCsv } from "@/lib/csv";

// Definición de las tablas de carga en lote. Sin dependencias de servidor: la usan el editor (cliente) y la acción (servidor).
export type BatchKind = "transactions" | "capex" | "fixed" | "allocations";
export type BatchCol = { key: string; label: string; width: string; numeric?: boolean; options?: string[]; match: (h: string) => boolean; help?: string };
export type BatchSpec = { title: string; blurb: string; cols: BatchCol[]; /** Nombre de hoja preferido cuando varias hojas encajan igual. */ sheetHint: RegExp };

export const MAX_BATCH_ROWS = 500;
export const CAPEX_CATEGORY_LABELS = ["Muebles", "Electrodomésticos", "Reformas", "Decoración", "Ropa de cama y cocina", "Tecnología", "Otros"];

const is = (...names: string[]) => (h: string) => names.includes(h);
const has = (...parts: string[]) => (h: string) => parts.every((p) => h.includes(p));

export const BATCH_SPECS: Record<BatchKind, BatchSpec> = {
  transactions: {
    title: "Movimientos",
    sheetHint: /mov/,
    blurb: "Gastos e ingresos históricos o del día a día. El monto va en positivo; el tipo define si es gasto o ingreso.",
    cols: [
      { key: "fecha", label: "Fecha", width: "9rem", match: is("fecha", "date"), help: "AAAA-MM-DD o DD/MM/AAAA" },
      { key: "tipo", label: "Tipo", width: "8rem", options: ["Gasto", "Ingreso"], match: is("tipo", "type") },
      { key: "monto", label: "Monto", width: "9rem", numeric: true, match: is("monto", "valor", "importe", "amount", "total") },
      { key: "cantidad", label: "Cant.", width: "5rem", numeric: true, match: is("cantidad", "cant", "qty", "unidades") },
      { key: "proveedor", label: "Proveedor", width: "11rem", match: is("proveedor", "tienda", "comercio", "vendor") },
      { key: "descripcion", label: "Descripción", width: "13rem", match: is("descripcion", "concepto", "detalle", "nota", "item") },
      { key: "categoria", label: "Categoría", width: "11rem", match: is("categoria", "category") },
      { key: "cuenta", label: "Cuenta", width: "9rem", match: is("cuenta", "account", "medio_de_pago") },
      { key: "estado", label: "Estado", width: "8rem", options: ["Pagado", "Pendiente"], match: is("estado", "status") },
    ],
  },
  capex: {
    title: "CAPEX",
    sheetHint: /capex|presupuesto/,
    blurb: "Ítems de adecuación. Con precio real el ítem queda como comprado. Los que ya existen (mismo nombre) se omiten.",
    cols: [
      { key: "categoria", label: "Categoría", width: "11rem", options: CAPEX_CATEGORY_LABELS, match: is("categoria", "category") },
      { key: "descripcion", label: "Descripción", width: "16rem", match: (h) => h.startsWith("item") || is("descripcion", "description", "articulo")(h) },
      { key: "cantidad", label: "Cant.", width: "5rem", numeric: true, match: is("cantidad", "cant", "qty") },
      { key: "precio_unitario_presupuestado", label: "Precio unit. presupuestado", width: "10rem", numeric: true, match: (h) => h === "precio_unitario_presupuestado" || (h.includes("presupuesto") && h.includes("unidad")) },
      { key: "precio_unitario_real", label: "Precio unit. real", width: "9rem", numeric: true, match: (h) => h === "precio_unitario_real" || (h.includes("real") && h.includes("unidad")) },
      { key: "tienda", label: "Tienda", width: "9rem", match: is("tienda", "store", "proveedor") },
    ],
  },
  allocations: {
    title: "Destino del crédito",
    sheetHint: /destino|prestamo|resumen/,
    blurb: "Cómo se reparte el dinero del crédito (inversión, pago de tarjetas, ahorro…). Los conceptos que ya existen en ese crédito se omiten.",
    cols: [
      { key: "categoria", label: "Categoría", width: "14rem", match: is("categoria", "category") },
      { key: "concepto", label: "Concepto", width: "22rem", match: is("concepto", "descripcion", "item", "destino") },
      { key: "valor", label: "Valor", width: "12rem", numeric: true, match: (h) => is("valor", "monto", "amount", "valor_total", "total")(h) },
    ],
  },
  fixed: {
    title: "Gastos fijos",
    sheetHint: /fijo/,
    blurb: "Gastos recurrentes (administración, servicios, suscripciones…). Los que ya existen (mismo nombre) se omiten.",
    cols: [
      { key: "nombre", label: "Nombre", width: "16rem", match: is("nombre", "name", "gasto") },
      { key: "concepto", label: "Concepto", width: "11rem", options: ["Administración", "Servicios", "Suscripciones", "Mantenimiento", "Otro"], match: is("concepto", "concept", "categoria") },
      { key: "monto", label: "Monto", width: "9rem", numeric: true, match: is("monto", "valor", "amount") },
      { key: "frecuencia", label: "Frecuencia", width: "9rem", options: ["Mensual", "Bimestral", "Trimestral", "Semestral", "Anual"], match: is("frecuencia", "frequency") },
      { key: "dia", label: "Día", width: "5rem", numeric: true, match: is("dia", "day", "dia_del_mes") },
    ],
  },
};

/** Convierte una celda de Excel/CSV a texto que el servidor sabe interpretar. */
export function cellText(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10);
  if (typeof v === "number") return Number.isFinite(v) ? String(Math.round(v * 100) / 100) : "";
  return String(v).replace(/\s+/g, " ").trim();
}

/** Texto pegado desde Excel/Sheets (TSV, con comillas cuando la celda trae saltos de línea). */
export function parseClipboard(text: string): string[][] {
  const t = text.replace(/\r\n?/g, "\n").replace(/\n+$/, "");
  if (!t) return [];
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"' && cell === "") q = true;
    else if (ch === "\t") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  row.push(cell); rows.push(row);
  return rows.map((r) => r.map((c) => c.replace(/\s+/g, " ").trim()));
}

export type Mapped = { rows: string[][]; mapped: string[]; missing: string[]; headerRow: number };
/** Busca la fila de encabezados (en las primeras 15) y reordena las columnas según la tabla de destino. */
export function mapSheet(kind: BatchKind, data: unknown[][]): Mapped | null {
  const cols = BATCH_SPECS[kind].cols;
  let best: { score: number; row: number; idx: number[] } | null = null;
  data.slice(0, 15).forEach((r, row) => {
    const heads = r.map((c) => norm(cellText(c)));
    const idx = cols.map((c) => heads.findIndex((h) => h && c.match(h)));
    const score = idx.filter((i) => i >= 0).length;
    if (score >= 2 && (!best || score > best.score)) best = { score, row, idx };
  });
  if (!best) return null;
  const { idx, row: headerRow } = best as { idx: number[]; row: number };
  const rows = data.slice(headerRow + 1).map((r) => idx.map((i) => (i >= 0 ? cellText(r[i]) : ""))).filter((r) => r.some(Boolean));
  return { rows, headerRow, mapped: cols.filter((_, i) => idx[i] >= 0).map((c) => c.label), missing: cols.filter((_, i) => idx[i] < 0).map((c) => c.label) };
}

export const csvToData = (text: string): string[][] => parseCsv(text);
