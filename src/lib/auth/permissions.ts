import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth/config";

export type Permission =
  | "transaction:create"
  | "capex:update"
  | "reservation:read"
  | "dashboard:full" // EBITDA, margen, flujo de caja total
  | "pyg:read"
  | "budget:write"
  | "member:manage";

const MATRIX: Record<Role, Permission[]> = {
  ADMIN: [
    "transaction:create", "capex:update", "reservation:read",
    "dashboard:full", "pyg:read", "budget:write", "member:manage",
  ],
  // OPERATOR registra gastos/insumos/aseo; nunca ve EBITDA ni PyG.
  OPERATOR: ["transaction:create", "capex:update"],
};

export const can = (role: Role, p: Permission) => MATRIX[role].includes(p);

/**
 * ÚNICO punto de entrada para Server Actions / Route Handlers / RSC:
 * valida sesión + pertenencia al workspace y devuelve el rol.
 * Toda query posterior DEBE filtrar por `workspaceId`.
 */
export async function requireWorkspace(workspaceId: string, permission?: Permission) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    select: { role: true },
  });
  if (!member) throw new Error("FORBIDDEN"); // no revelar si el workspace existe
  if (permission && !can(member.role, permission)) throw new Error("FORBIDDEN");

  return { userId: session.user.id, role: member.role, workspaceId };
}
