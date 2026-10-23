import type { Role } from "@/generated/prisma/client";

// Matriz de permisos pura (sin dependencias de Next/Auth): testeable y reutilizable.
export type Permission =
  | "transaction:create"
  | "capex:update"
  | "dashboard:full" // EBITDA, margen, flujo de caja total
  | "pyg:read"
  | "airbnb:manage" // reservas, gastos fijos, propiedades
  | "budget:write"
  | "member:manage";

const MATRIX: Record<Role, Permission[]> = {
  ADMIN: ["transaction:create", "capex:update", "dashboard:full", "pyg:read", "airbnb:manage", "budget:write", "member:manage"],
  // OPERATOR registra gastos/insumos/aseo y marca CAPEX; nunca ve EBITDA, PyG ni ingresos.
  OPERATOR: ["transaction:create", "capex:update"],
};
export const can = (role: Role, p: Permission) => MATRIX[role].includes(p);

