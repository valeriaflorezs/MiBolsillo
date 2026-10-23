import type { Role, WorkspaceType } from "@/generated/prisma/client";
import { can } from "@/lib/auth/rbac";

export type Tab = { href: string; label: string };

/** Pestañas visibles según tipo de negocio y rol (la autorización real está en cada página/acción). */
export function tabsFor(workspaceId: string, type: WorkspaceType, role: Role): { primary: Tab[]; more: Tab[] } {
  const b = `/w/${workspaceId}`;
  const admin = can(role, "dashboard:full");
  const primary: Tab[] = [{ href: b, label: "Resumen" }, { href: `${b}/transactions`, label: "Movimientos" }];
  const more: Tab[] = [];
  if (admin) primary.push({ href: `${b}/stats`, label: "Estadísticas" });
  if (type === "AIRBNB") {
    primary.push({ href: `${b}/capex`, label: "CAPEX" });
    if (can(role, "pyg:read")) primary.push({ href: `${b}/pyg`, label: "PyG" });
    if (can(role, "airbnb:manage")) primary.push({ href: `${b}/reservations`, label: "Reservas" });
    if (can(role, "airbnb:manage")) more.push({ href: `${b}/fixed`, label: "Gastos fijos" }, { href: `${b}/properties`, label: "Propiedades" });
  }
  if (admin) more.push({ href: `${b}/accounts`, label: "Cuentas" }, { href: `${b}/budget`, label: "Presupuesto" }, { href: `${b}/categories`, label: "Categorías" });
  more.push({ href: `${b}/wishlist`, label: "Lista de deseos" });
  if (can(role, "member:manage")) more.push({ href: `${b}/settings`, label: "Miembros y ajustes" });
  return { primary, more };
}
