import type { ExpenseKind, PygLine, WorkspaceType } from "@/generated/prisma/client";

export type DefaultCategory = { name: string; emoji: string; income?: boolean; kind?: ExpenseKind; pygLine: PygLine };

const AIRBNB: DefaultCategory[] = [
  { name: "Hospedaje", emoji: "hotel", income: true, pygLine: "REVENUE" },
  { name: "Otros ingresos", emoji: "payments", income: true, pygLine: "REVENUE" },
  { name: "Comisión plataforma", emoji: "commission", kind: "VARIABLE", pygLine: "COMMISSION" },
  { name: "Aseo", emoji: "cleaning", kind: "VARIABLE", pygLine: "CLEANING" },
  { name: "Lavandería", emoji: "laundry", kind: "VARIABLE", pygLine: "CLEANING" },
  { name: "Amenities e insumos", emoji: "coffee", kind: "VARIABLE", pygLine: "AMENITIES" },
  { name: "Otros variables", emoji: "inventory", kind: "VARIABLE", pygLine: "OTHER_VARIABLE" },
  { name: "Administración (HOA)", emoji: "apartment", kind: "FIXED_OPEX", pygLine: "ADMIN" },
  { name: "Servicios públicos", emoji: "bulb", kind: "FIXED_OPEX", pygLine: "UTILITIES" },
  { name: "Internet y apps", emoji: "wifi", kind: "FIXED_OPEX", pygLine: "SUBSCRIPTIONS" },
  { name: "Mantenimiento", emoji: "build", kind: "FIXED_OPEX", pygLine: "MAINTENANCE" },
  { name: "Otros fijos", emoji: "folder", kind: "FIXED_OPEX", pygLine: "OTHER_FIXED" },
  { name: "Muebles y reformas", emoji: "chair", kind: "CAPEX", pygLine: "CAPEX" },
];

const PERSONAL: DefaultCategory[] = [
  { name: "Salario", emoji: "work", income: true, pygLine: "REVENUE" },
  { name: "Otros ingresos", emoji: "payments", income: true, pygLine: "REVENUE" },
  { name: "Vivienda", emoji: "home", kind: "FIXED_OPEX", pygLine: "OTHER_FIXED" },
  { name: "Servicios", emoji: "bulb", kind: "FIXED_OPEX", pygLine: "UTILITIES" },
  { name: "Alimentación", emoji: "cart", kind: "VARIABLE", pygLine: "OTHER_VARIABLE" },
  { name: "Transporte", emoji: "bus", kind: "VARIABLE", pygLine: "OTHER_VARIABLE" },
  { name: "Salud", emoji: "health", kind: "VARIABLE", pygLine: "OTHER_VARIABLE" },
  { name: "Ocio", emoji: "movie", kind: "VARIABLE", pygLine: "OTHER_VARIABLE" },
  { name: "Compras grandes", emoji: "bag", kind: "CAPEX", pygLine: "CAPEX" },
];

const GIG: DefaultCategory[] = [
  { name: "Ingresos por viajes", emoji: "car", income: true, pygLine: "REVENUE" },
  { name: "Propinas y bonos", emoji: "gift", income: true, pygLine: "REVENUE" },
  { name: "Comisión plataforma", emoji: "commission", kind: "VARIABLE", pygLine: "COMMISSION" },
  { name: "Combustible", emoji: "gas", kind: "VARIABLE", pygLine: "OTHER_VARIABLE" },
  { name: "Peajes y parqueo", emoji: "parking", kind: "VARIABLE", pygLine: "OTHER_VARIABLE" },
  { name: "Lavado", emoji: "carwash", kind: "VARIABLE", pygLine: "AMENITIES" },
  { name: "Seguro y SOAT", emoji: "shield", kind: "FIXED_OPEX", pygLine: "ADMIN" },
  { name: "Mantenimiento vehículo", emoji: "build", kind: "FIXED_OPEX", pygLine: "MAINTENANCE" },
  { name: "Datos / apps", emoji: "wifi", kind: "FIXED_OPEX", pygLine: "SUBSCRIPTIONS" },
];

export const DEFAULT_CATEGORIES: Record<WorkspaceType, DefaultCategory[]> = {
  AIRBNB,
  PERSONAL,
  FREELANCE: [
    { name: "Honorarios", emoji: "receipt", income: true, pygLine: "REVENUE" },
    { name: "Herramientas y software", emoji: "laptop", kind: "FIXED_OPEX", pygLine: "SUBSCRIPTIONS" },
    { name: "Impuestos y seguridad social", emoji: "bank", kind: "FIXED_OPEX", pygLine: "ADMIN" },
    { name: "Gastos del proyecto", emoji: "inventory", kind: "VARIABLE", pygLine: "OTHER_VARIABLE" },
    { name: "Equipos", emoji: "desktop", kind: "CAPEX", pygLine: "CAPEX" },
  ],
  GIG_ECONOMY: GIG,
};

/** Categorías de sistema: mueven dinero pero no son ventas ni gastos de la operación (fuera del PyG). */
export const FINANCIAL_CATEGORIES: DefaultCategory[] = [
  { name: "Desembolso de crédito", emoji: "bank", income: true, pygLine: "NON_OPERATING" },
  { name: "Ajuste de saldo a favor", emoji: "balance", income: true, pygLine: "NON_OPERATING" },
  { name: "Ajuste de saldo en contra", emoji: "balance", kind: "FIXED_OPEX", pygLine: "NON_OPERATING" },
  { name: "Intereses y cargos financieros", emoji: "bank", kind: "FIXED_OPEX", pygLine: "NON_OPERATING" },
];

export const WORKSPACE_TYPE_LABEL: Record<WorkspaceType, string> = {
  AIRBNB: "Airbnb / alquiler corto",
  PERSONAL: "Finanzas personales",
  FREELANCE: "Freelance",
  GIG_ECONOMY: "Conductor / economía gig",
};
