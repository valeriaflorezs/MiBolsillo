import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth/config";

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

const getMembership = cache(async (workspaceId: string) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { status: "unauth" as const };
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true, workspace: { select: { id: true, name: true, type: true, archived: true } } },
  });
  return m ? { status: "ok" as const, userId, role: m.role, workspace: m.workspace } : { status: "none" as const };
});

/** Server Actions / Route Handlers: valida sesión + pertenencia + permiso. Todo query posterior filtra por workspaceId. */
export async function requireWorkspace(workspaceId: string, permission?: Permission) {
  const m = await getMembership(workspaceId);
  if (m.status === "unauth") throw new Error("UNAUTHENTICATED");
  if (m.status === "none") throw new Error("FORBIDDEN"); // no revela si el workspace existe
  if (permission && !can(m.role, permission)) throw new Error("FORBIDDEN");
  return { userId: m.userId, role: m.role, workspace: m.workspace, workspaceId };
}

/** Páginas (RSC): igual que arriba pero con redirecciones. */
export async function pageCtx(workspaceId: string, permission?: Permission) {
  const m = await getMembership(workspaceId);
  if (m.status === "unauth") redirect("/login");
  if (m.status === "none") notFound();
  if (permission && !can(m.role, permission)) redirect(`/w/${workspaceId}`);
  return { userId: m.userId, role: m.role, workspace: m.workspace, workspaceId };
}

export async function requireUser() {
  const s = await auth();
  if (!s?.user?.id) redirect("/login");
  return s.user;
}
