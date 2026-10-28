import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { noteAction } from "@/lib/audit";
import { isPlatformAdmin } from "@/lib/auth/platform";

export { can, type Permission } from "./rbac";
import { can, type Permission } from "./rbac";

const getMembership = cache(async (workspaceId: string) => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !session) return { status: "unauth" as const };
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true, user: { select: { active: true } }, workspace: { select: { id: true, name: true, type: true, archived: true } } },
  });
  if (m && !m.user.active) return { status: "unauth" as const }; // cuenta desactivada: se trata como sesión vencida
  if (!m && isPlatformAdmin(session.user?.email)) {
    // El superusuario de la plataforma entra a cualquier negocio con permisos de administrador.
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, name: true, type: true, archived: true } });
    return workspace ? { status: "ok" as const, userId, role: "ADMIN" as const, workspace } : { status: "none" as const };
  }
  return m ? { status: "ok" as const, userId, role: m.role, workspace: m.workspace } : { status: "none" as const };
});

/** Server Actions / Route Handlers: valida sesión + pertenencia + permiso. Todo query posterior filtra por workspaceId. */
export async function requireWorkspace(workspaceId: string, permission?: Permission) {
  const m = await getMembership(workspaceId);
  if (m.status === "unauth") throw new Error("UNAUTHENTICATED");
  if (m.status === "none") throw new Error("FORBIDDEN"); // no revela si el workspace existe
  noteAction({ userId: m.userId, workspaceId, permission }); // `run` lo usa para registrar el cambio (o el rechazo)
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
  const u = await prisma.user.findUnique({ where: { id: s.user.id }, select: { active: true } });
  if (!u?.active) redirect("/login");
  return s.user;
}
