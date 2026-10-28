import type { Role, WorkspaceType } from "@/generated/prisma/client";
import { can } from "@/lib/auth/rbac";

export type NavIcon = "home" | "tx" | "stats" | "capex" | "pyg" | "fixed" | "props" | "accounts" | "budget" | "cats" | "wish" | "settings" | "pending" | "account" | "batch" | "debt";
export type Tab = { href: string; label: string; icon: NavIcon };

/** Secciones visibles según tipo de negocio y rol (la autorización real está en cada página/acción). */
export function tabsFor(workspaceId: string, type: WorkspaceType, role: Role): { primary: Tab[]; more: Tab[] } {
  const b = `/w/${workspaceId}`;
  const admin = can(role, "dashboard:full");
  const reader = can(role, "finance:read");
  const writer = can(role, "transaction:create");
  const primary: Tab[] = [{ href: b, label: "Resumen", icon: "home" }, { href: `${b}/transactions`, label: "Movimientos", icon: "tx" }];
  const more: Tab[] = [];
  if (reader) primary.push({ href: `${b}/stats`, label: "Estadísticas", icon: "stats" });
  if (type === "AIRBNB") {
    primary.push({ href: `${b}/capex`, label: "CAPEX", icon: "capex" });
    if (can(role, "pyg:read")) primary.push({ href: `${b}/pyg`, label: "PyG", icon: "pyg" });
    if (can(role, "airbnb:manage")) more.push({ href: `${b}/fixed`, label: "Gastos fijos", icon: "fixed" }, { href: `${b}/properties`, label: "Propiedades", icon: "props" });
  }
  if (reader) more.push({ href: `${b}/accounts`, label: "Cuentas y deudas", icon: "accounts" });
  if (admin) more.push({ href: `${b}/budget`, label: "Presupuesto", icon: "budget" }, { href: `${b}/categories`, label: "Categorías", icon: "cats" });
  if (admin) more.push({ href: `${b}/batch`, label: "Carga en lote", icon: "batch" });
  if (writer) more.push({ href: `${b}/wishlist`, label: "Lista de deseos", icon: "wish" });
  if (can(role, "member:invite")) more.push({ href: `${b}/settings`, label: can(role, "member:manage") ? "Miembros y ajustes" : "Invitar personas", icon: "settings" });
  return { primary, more };
}
