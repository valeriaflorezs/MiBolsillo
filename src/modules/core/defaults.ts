import type { ExpenseKind, PygLine, WorkspaceType } from "@/generated/prisma/client";

export type DefaultCategory = { name: string; emoji: string; income?: boolean; kind?: ExpenseKind; pygLine: PygLine };

const AIRBNB: DefaultCategory[] = [
  { name: "Hospedaje", emoji: "🛏️", income: true, pygLine: "REVENUE" },
  { name: "Otros ingresos", emoji: "💵", income: true, pygLine: "REVENUE" },
  { name: "Comisión plataforma", emoji: "💸", kind: "VARIABLE", pygLine: "COMMISSION" },
  { name: "Aseo", emoji: "🧹", kind: "VARIABLE", pygLine: "CLEANING" },
  { name: "Lavandería", emoji: "🧺", kind: "VARIABLE", pygLine: "CLEANING" },
  { name: "Amenities e insumos", emoji: "☕", kind: "VARIABLE", pygLine: "AMENITIES" },
  { name: "Otros variables", emoji: "📦", kind: "VARIABLE", pygLine: "OTHER_VARIABLE" },
  { name: "Administración (HOA)", emoji: "🏢", kind: "FIXED_OPEX", pygLine: "ADMIN" },
  { name: "Servicios públicos", emoji: "💡", kind: "FIXED_OPEX", pygLine: "UTILITIES" },
  { name: "Internet y apps", emoji: "📶", kind: "FIXED_OPEX", pygLine: "SUBSCRIPTIONS" },
  { name: "Mantenimiento", emoji: "🔧", kind: "FIXED_OPEX", pygLine: "MAINTENANCE" },
  { name: "Otros fijos", emoji: "🗂️", kind: "FIXED_OPEX", pygLine: "OTHER_FIXED" },
  { name: "Muebles y reformas", emoji: "🛋️", kind: "CAPEX", pygLine: "CAPEX" },
];

const PERSONAL: DefaultCategory[] = [
  { name: "Salario", emoji: "💼", income: true, pygLine: "REVENUE" },
  { name: "Otros ingresos", emoji: "💵", income: true, pygLine: "REVENUE" },
  { name: "Vivienda", emoji: "🏠", kind: "FIXED_OPEX", pygLine: "OTHER_FIXED" },
  { name: "Servicios", emoji: "💡", kind: "FIXED_OPEX", pygLine: "UTILITIES" },
  { name: "Alimentación", emoji: "🛒", kind: "VARIABLE", pygLine: "OTHER_VARIABLE" },
  { name: "Transporte", emoji: "🚌", kind: "VARIABLE", pygLine: "OTHER_VARIABLE" },
  { name: "Salud", emoji: "🩺", kind: "VARIABLE", pygLine: "OTHER_VARIABLE" },
  { name: "Ocio", emoji: "🎬", kind: "VARIABLE", pygLine: "OTHER_VARIABLE" },
  { name: "Compras grandes", emoji: "🛍️", kind: "CAPEX", pygLine: "CAPEX" },
];

const GIG: DefaultCategory[] = [
  { name: "Ingresos por viajes", emoji: "🚗", income: true, pygLine: "REVENUE" },
  { name: "Propinas y bonos", emoji: "🎁", income: true, pygLine: "REVENUE" },
  { name: "Comisión plataforma", emoji: "💸", kind: "VARIABLE", pygLine: "COMMISSION" },
  { name: "Combustible", emoji: "⛽", kind: "VARIABLE", pygLine: "OTHER_VARIABLE" },
  { name: "Peajes y parqueo", emoji: "🅿️", kind: "VARIABLE", pygLine: "OTHER_VARIABLE" },
  { name: "Lavado", emoji: "🧽", kind: "VARIABLE", pygLine: "AMENITIES" },
  { name: "Seguro y SOAT", emoji: "🛡️", kind: "FIXED_OPEX", pygLine: "ADMIN" },
  { name: "Mantenimiento vehículo", emoji: "🔧", kind: "FIXED_OPEX", pygLine: "MAINTENANCE" },
  { name: "Datos / apps", emoji: "📶", kind: "FIXED_OPEX", pygLine: "SUBSCRIPTIONS" },
];

export const DEFAULT_CATEGORIES: Record<WorkspaceType, DefaultCategory[]> = {
  AIRBNB,
  PERSONAL,
  FREELANCE: [
    { name: "Honorarios", emoji: "🧾", income: true, pygLine: "REVENUE" },
    { name: "Herramientas y software", emoji: "💻", kind: "FIXED_OPEX", pygLine: "SUBSCRIPTIONS" },
    { name: "Impuestos y seguridad social", emoji: "🏛️", kind: "FIXED_OPEX", pygLine: "ADMIN" },
    { name: "Gastos del proyecto", emoji: "📦", kind: "VARIABLE", pygLine: "OTHER_VARIABLE" },
    { name: "Equipos", emoji: "🖥️", kind: "CAPEX", pygLine: "CAPEX" },
  ],
  GIG_ECONOMY: GIG,
};

export const WORKSPACE_TYPE_LABEL: Record<WorkspaceType, string> = {
  AIRBNB: "Airbnb / alquiler corto",
  PERSONAL: "Finanzas personales",
  FREELANCE: "Freelance",
  GIG_ECONOMY: "Conductor / economía gig",
};
