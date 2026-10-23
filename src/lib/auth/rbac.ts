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


/** ADMIN modifica cualquier movimiento; OPERATOR solo sus propios gastos durante 48 h tras registrarlos. */
export function canMutateTx(role: Role, tx: { createdById: string; type: string; createdAt: Date }, userId: string, now = Date.now()) {
  if (can(role, "dashboard:full")) return true;
  return tx.createdById === userId && tx.type === "EXPENSE" && now - tx.createdAt.getTime() < 48 * 3_600_000;
}
