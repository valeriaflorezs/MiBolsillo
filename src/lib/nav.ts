import type { Role, WorkspaceType } from "@/generated/prisma/client";
import { can } from "@/lib/auth/permissions";

export type Tab = { href: string; label: string };

/** Pestañas visibles según tipo de negocio y rol (la autorización real está en cada página/acción). */
export function tabsFor(workspaceId: string, type: WorkspaceType, role: Role): Tab[] {
  const b = `/w/${workspaceId}`;
  const t: Tab[] = [{ href: b, label: "Resumen" }, { href: `${b}/transactions`, label: "Gastos" }];
  if (type === "AIRBNB") {
    t.push({ href: `${b}/capex`, label: "CAPEX" });
    if (can(role, "pyg:read")) t.push({ href: `${b}/pyg`, label: "PyG" });
    if (can(role, "airbnb:manage")) t.push({ href: `${b}/reservations`, label: "Reservas" }, { href: `${b}/fixed`, label: "Gastos fijos" });
  }
  if (can(role, "dashboard:full")) t.push({ href: `${b}/accounts`, label: "Cuentas" }, { href: `${b}/budget`, label: "Presupuesto" });
  t.push({ href: `${b}/wishlist`, label: "Deseos" });
  if (can(role, "member:manage")) t.push({ href: `${b}/settings`, label: "Miembros" });
  return t;
}
