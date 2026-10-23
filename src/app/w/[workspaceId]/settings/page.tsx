import { headers } from "next/headers";
import { ActionForm } from "@/components/forms/action-form";
import { DeleteButton } from "@/components/forms/delete-button";
import { Avatar } from "@/components/ui/avatar";
import { revokeInviteAction } from "@/modules/core/crud-actions";
import { prisma } from "@/lib/db";
import { pageCtx } from "@/lib/auth/permissions";
import { changeMemberRoleAction, createInviteAction, createViewerAction, deleteWorkspaceAction, removeMemberAction, resetViewerPasswordAction } from "@/modules/core/actions";
import { ROLE_LABEL } from "@/lib/auth/rbac";

export const metadata = { title: "Miembros" };

export default async function SettingsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const { userId, workspace } = await pageCtx(workspaceId, "member:manage");
  const [members, invites, h] = await Promise.all([
    prisma.workspaceMember.findMany({ where: { workspaceId }, include: { user: { select: { name: true, email: true, image: true, username: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.workspaceInvite.findMany({ where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } } }),
    headers(),
  ]);
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Miembros</h1>
      <section className="card space-y-3">
        <h2 className="font-medium">Equipo</h2>
        <ul className="divide-y divide-line">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={m.user.name ?? m.user.email} image={m.user.image} size={40} /><div>
                <p className="font-medium">{m.user.name ?? m.user.email}</p>
                <p className="text-sm text-muted">{m.user.username ? `Usuario: ${m.user.username}` : m.user.email}</p>
              </div></div>
              {m.userId === userId ? <span className="text-sm text-muted">Tú · {ROLE_LABEL[m.role]}</span> : (
                <div className="flex flex-wrap items-center gap-2">
                  {m.user.username && (
                    <ActionForm action={resetViewerPasswordAction} submitLabel="Nueva contraseña" variant="ghost" className="flex flex-wrap items-center gap-2" resetOnSuccess={false}>
                      <input type="hidden" name="workspaceId" value={workspaceId} />
                      <input type="hidden" name="memberId" value={m.id} />
                    </ActionForm>
                  )}
                  {!m.user.username && <ActionForm action={changeMemberRoleAction} submitLabel="Cambiar" variant="ghost" className="flex items-center gap-2" resetOnSuccess={false}>
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="memberId" value={m.id} />
                    <select name="role" defaultValue={m.role} aria-label="Rol" className="input !w-auto">
                      <option value="ADMIN">Administrador</option>
                      <option value="OPERATOR">Operador</option>
                      <option value="VIEWER">Solo lectura</option>
                    </select>
                  </ActionForm>}
                  <ActionForm action={removeMemberAction} submitLabel="Quitar" variant="ghost" className="flex items-center gap-2">
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="memberId" value={m.id} />
                  </ActionForm>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-4">
        <h2 className="font-medium">Dar acceso de solo lectura</h2>
        <p className="text-sm text-muted">Crea un usuario y una contraseña para que otra persona <strong>vea</strong> la información de este negocio (resumen, movimientos, CAPEX, reservas, PyG) sin poder agregar, editar ni borrar nada. No necesita cuenta de Google. La contraseña se muestra una sola vez: compártela por un canal privado.</p>
        <ActionForm action={createViewerAction} submitLabel="Crear acceso" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div><label className="label" htmlFor="vname">Nombre</label><input id="vname" name="name" required className="input" placeholder="Hermano de Tania" /></div>
          <div><label className="label" htmlFor="vuser">Usuario</label><input id="vuser" name="username" required autoCapitalize="none" spellCheck={false} className="input" placeholder="hermano.tania" /></div>
        </ActionForm>
      </section>

      <section className="card space-y-4">
        <h2 className="font-medium">Invitar a alguien</h2>
        <p className="text-sm text-muted">El <strong>Operador</strong> registra gastos, insumos y facturas de aseo, pero no ve ingresos, EBITDA ni PyG. Comparte el enlace; solo funciona con el correo invitado.</p>
        <ActionForm action={createInviteAction} submitLabel="Crear invitación" className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div><label className="label" htmlFor="email">Correo (Google)</label><input id="email" name="email" type="email" required className="input" /></div>
          <div><label className="label" htmlFor="role">Rol</label>
            <select id="role" name="role" className="input" defaultValue="OPERATOR"><option value="OPERATOR">Operador</option><option value="VIEWER">Solo lectura</option><option value="ADMIN">Administrador</option></select></div>
        </ActionForm>
        {invites.length > 0 && (
          <ul className="space-y-2 text-sm">
            {invites.map((i) => (
              <li key={i.id} className="rounded-xl bg-canvas p-3">
                <span className="font-medium">{i.email}</span> · {ROLE_LABEL[i.role]}
                <code className="mt-1 block break-all text-xs text-muted">{origin}/invite/{i.token}</code>
                <div className="mt-2"><DeleteButton action={revokeInviteAction} fields={{ workspaceId, inviteId: i.id }} label="Revocar" confirmText="¿Revocar esta invitación?" /></div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-3 border border-negative/30">
        <h2 className="font-medium text-negative">Eliminar este negocio</h2>
        <p className="text-sm text-muted">Borra definitivamente movimientos, reservas, CAPEX, miembros y comprobantes. No se puede deshacer.</p>
        <ActionForm action={deleteWorkspaceAction} submitLabel="Eliminar definitivamente" variant="ghost" resetOnSuccess={false}>
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <label className="label" htmlFor="confirm">Escribe «{workspace.name}» para confirmar</label>
          <input id="confirm" name="confirm" required autoComplete="off" className="input max-w-sm" />
        </ActionForm>
      </section>
    </>
  );
}
