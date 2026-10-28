import { headers } from "next/headers";
import { ActionForm } from "@/components/forms/action-form";
import { FormDialog } from "@/components/forms/form-dialog";
import { IconAction } from "@/components/forms/icon-action";
import { Avatar } from "@/components/ui/avatar";
import { revokeInviteAction } from "@/modules/core/crud-actions";
import { prisma } from "@/lib/db";
import { can, pageCtx } from "@/lib/auth/permissions";
import { changeMemberRoleAction, createInviteAction, createViewerAction, deleteWorkspaceAction, removeMemberAction, resetViewerPasswordAction } from "@/modules/core/actions";
import { ROLE_LABEL } from "@/lib/auth/rbac";

export const metadata = { title: "Miembros" };

export default async function SettingsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const { userId, role, workspace } = await pageCtx(workspaceId, "member:invite");
  const manage = can(role, "member:manage"); // el Operador solo invita (Operador o Solo lectura); el resto es del Administrador
  const [members, invites, h] = await Promise.all([
    prisma.workspaceMember.findMany({ where: { workspaceId }, include: { user: { select: { name: true, email: true, image: true, username: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.workspaceInvite.findMany({ where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() }, ...(manage ? {} : { invitedById: userId }) } }),
    headers(),
  ]);
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{manage ? "Miembros" : "Invitar personas"}</h1>
        <div className="flex items-center gap-2">
          <FormDialog label="Dar acceso de solo lectura" icon="key" tone="default" title="Dar acceso de solo lectura">
            <ActionForm action={createViewerAction} submitLabel="Crear acceso">
              <p className="text-sm text-muted">Crea un usuario y una contraseña para que otra persona <strong>vea</strong> la información de este negocio (resumen, movimientos, CAPEX, PyG) sin poder agregar, editar ni borrar nada. No necesita cuenta de Google. La contraseña se muestra una sola vez: compártela por un canal privado.</p>
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label" htmlFor="vname">Nombre</label><input id="vname" name="name" required className="input" placeholder="Nombre de la persona" /></div>
                <div><label className="label" htmlFor="vuser">Usuario</label><input id="vuser" name="username" required autoCapitalize="none" spellCheck={false} className="input" placeholder="nombre.apellido" /></div>
              </div>
            </ActionForm>
          </FormDialog>
          <FormDialog label="Invitar con Google" icon="person_add" title="Invitar a alguien">
            <ActionForm action={createInviteAction} submitLabel="Crear invitación">
              <p className="text-sm text-muted">El <strong>Operador</strong> registra gastos, insumos y facturas de aseo, pero no ve ingresos, EBITDA ni PyG. Comparte el enlace; solo funciona con el correo invitado.</p>
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div><label className="label" htmlFor="email">Correo (Google)</label><input id="email" name="email" type="email" required className="input" /></div>
                <div><label className="label" htmlFor="role">Rol</label>
                  <select id="role" name="role" className="input" defaultValue="OPERATOR"><option value="OPERATOR">Operador</option><option value="VIEWER">Solo lectura</option>{manage && <option value="ADMIN">Administrador</option>}</select></div>
              </div>
            </ActionForm>
          </FormDialog>
        </div>
      </div>
      {manage && <section className="card space-y-3">
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
                  {m.user.username && <IconAction action={resetViewerPasswordAction} icon="key" label="Nueva contraseña" confirm={`¿Generar una contraseña nueva para ${m.user.username}? La anterior dejará de funcionar.`} fields={{ workspaceId, memberId: m.id }} />}
                  {!m.user.username && (
                    <IconAction action={changeMemberRoleAction} icon="manage_accounts" label="Cambiar rol" submitLabel="Guardar rol" fields={{ workspaceId, memberId: m.id }}>
                      <div><label className="label" htmlFor={`role${m.id}`}>Rol de {m.user.name ?? m.user.email}</label>
                        <select id={`role${m.id}`} name="role" defaultValue={m.role} className="input"><option value="ADMIN">Administrador</option><option value="OPERATOR">Operador</option><option value="VIEWER">Solo lectura</option></select></div>
                    </IconAction>
                  )}
                  <IconAction action={removeMemberAction} icon="delete" tone="danger" label="Quitar del negocio" confirm={`¿Quitar a ${m.user.name ?? m.user.email} de este negocio?`} fields={{ workspaceId, memberId: m.id }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>}

      {invites.length > 0 && (
      <section className="card space-y-3">
        <h2 className="font-medium">Invitaciones pendientes</h2>
        {invites.length > 0 && (
          <ul className="space-y-2 text-sm">
            {invites.map((i) => (
              <li key={i.id} className="rounded-xl bg-canvas p-3">
                <span className="font-medium">{i.email}</span> · {ROLE_LABEL[i.role]}
                <code className="mt-1 block break-all text-xs text-muted">{origin}/invite/{i.token}</code>
                {manage && <div className="mt-2"><IconAction action={revokeInviteAction} fields={{ workspaceId, inviteId: i.id }} icon="delete" tone="danger" label="Revocar" confirm="¿Revocar esta invitación?" /></div>}
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      {manage && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-negative/30 p-4">
          <p className="text-sm text-muted">Eliminar este negocio borra movimientos, CAPEX, miembros y comprobantes. No se puede deshacer.</p>
          <IconAction action={deleteWorkspaceAction} icon="delete" tone="danger" label="Eliminar este negocio" submitLabel="Eliminar definitivamente" fields={{ workspaceId }}>
            <label className="label" htmlFor="confirm">Escribe «{workspace.name}» para confirmar</label>
            <input id="confirm" name="confirm" required autoComplete="off" className="input" />
          </IconAction>
        </div>
      )}
    </>
  );
}
