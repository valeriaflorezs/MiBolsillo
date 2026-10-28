import { ActionForm } from "@/components/forms/action-form";
import { FormDialog } from "@/components/forms/form-dialog";
import { IconAction } from "@/components/forms/icon-action";
import { IconButton } from "@/components/ui/icon-button";
import { prisma } from "@/lib/db";
import { generatePassword } from "@/lib/auth/credentials";
import { CRED_DOMAIN } from "@/lib/auth/credentials-shared";
import { auth } from "@/lib/auth/config";
import { ROLE_LABEL } from "@/lib/auth/rbac";
import { fmtDateTime } from "@/lib/admin-range";
import { WORKSPACE_TYPE_LABEL } from "@/modules/core/defaults";
import { changePlatformMemberRoleAction, createPlatformUserAction, createPlatformWorkspaceAction, resetPlatformPasswordAction, setUserActiveAction } from "@/modules/admin/actions";

export const metadata = { title: "Administración · Empresas y usuarios" };

export default async function AdminHome() {
  const me = (await auth())?.user?.id;
  const [workspaces, users] = await Promise.all([
    prisma.workspace.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, type: true, archived: true, createdAt: true, _count: { select: { members: true, transactions: true } } } }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 500, select: { id: true, username: true, email: true, name: true, active: true, memberships: { select: { id: true, role: true, workspace: { select: { name: true } } } } } }),
  ]);
  const initial = generatePassword(11);

  return (
    <>
      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Empresas</h2>
          <FormDialog label="Nueva empresa" title="Nueva empresa">
            <ActionForm action={createPlatformWorkspaceAction} submitLabel="Crear empresa">
              <div className="space-y-3">
                <div><label className="label" htmlFor="wn">Nombre</label><input id="wn" name="name" required className="input" /></div>
                <div><label className="label" htmlFor="wt">Tipo</label><select id="wt" name="type" className="input" defaultValue="AIRBNB">{Object.entries(WORKSPACE_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                <div><label className="label" htmlFor="wa">Administrador inicial</label><select id="wa" name="adminUserId" className="input" defaultValue={me}>{users.filter((u) => !u.username && u.active).map((u) => <option key={u.id} value={u.id}>{u.name ? `${u.name} · ` : ""}{u.email}</option>)}</select></div>
                <p className="text-sm text-muted">Se crea con las categorías y la cuenta de efectivo por defecto. El administrador inicial es una persona que ingresa con Google.</p>
              </div>
            </ActionForm>
          </FormDialog>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full">
            <thead><tr><th className="th">EMPRESA</th><th className="th">TIPO</th><th className="th text-right">MIEMBROS</th><th className="th text-right">MOVIMIENTOS</th><th className="th">CREADA</th><th className="th">ESTADO</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-line">
              {workspaces.map((w) => (
                <tr key={w.id}>
                  <td className="td font-medium">{w.name}</td>
                  <td className="td">{WORKSPACE_TYPE_LABEL[w.type]}</td>
                  <td className="td text-right">{w._count.members}</td>
                  <td className="td text-right">{w._count.transactions}</td>
                  <td className="td">{fmtDateTime(w.createdAt).split(",")[0]}</td>
                  <td className="td">{w.archived ? "Archivada" : "Activa"}</td>
                  <td className="td"><div className="flex justify-end"><IconButton href={`/w/${w.id}`} icon="open" label="Abrir empresa" /></div></td>
                </tr>
              ))}
              {workspaces.length === 0 && <tr><td className="td text-muted" colSpan={7}>Aún no hay empresas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Usuarios</h2>
          <FormDialog label="Nuevo usuario" title="Nuevo usuario">
            <ActionForm action={createPlatformUserAction} submitLabel="Crear usuario">
              <p className="text-sm text-muted">Crea una cuenta con usuario y clave, de solo lectura, en la empresa elegida. Las personas con Google se invitan desde los ajustes de cada empresa.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label" htmlFor="nu">Usuario</label><input id="nu" name="username" required autoCapitalize="none" spellCheck={false} className="input" placeholder="nombre.apellido" /></div>
                <div><label className="label" htmlFor="nn">Nombre</label><input id="nn" name="name" required className="input" /></div>
                <div><label className="label" htmlFor="nw">Empresa</label><select id="nw" name="workspaceId" required className="input">{workspaces.filter((w) => !w.archived).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
                <div><label className="label" htmlFor="np">Clave inicial</label><input id="np" name="password" required minLength={8} defaultValue={initial} autoComplete="off" spellCheck={false} className="input font-mono" /></div>
              </div>
            </ActionForm>
          </FormDialog>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full">
            <thead><tr><th className="th">USUARIO</th><th className="th">NOMBRE</th><th className="th">EMPRESA</th><th className="th">ESTADO</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                  <td className="td">{u.username ?? u.email}</td>
                  <td className="td">{u.name ?? "—"}</td>
                  <td className="td">{u.memberships.length ? u.memberships.map((m) => `${m.workspace.name} (${ROLE_LABEL[m.role]})`).join(", ") : "—"}</td>
                  <td className="td">{u.active ? "Activo" : "Desactivado"}</td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-2">
                      {!u.username && u.memberships.length > 0 && (
                        <IconAction action={changePlatformMemberRoleAction} icon="manage_accounts" label="Cambiar rol" submitLabel="Guardar rol">
                          <p className="text-sm text-muted">{u.name ?? u.email}</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div><label className="label" htmlFor={`m${u.id}`}>Empresa</label><select id={`m${u.id}`} name="memberId" className="input">{u.memberships.map((m) => <option key={m.id} value={m.id}>{m.workspace.name} ({ROLE_LABEL[m.role]})</option>)}</select></div>
                            <div><label className="label" htmlFor={`r${u.id}`}>Rol</label><select id={`r${u.id}`} name="role" className="input" defaultValue="OPERATOR"><option value="ADMIN">Administrador</option><option value="OPERATOR">Operador</option><option value="VIEWER">Solo lectura</option></select></div>
                          </div>
                        </IconAction>
                      )}
                      {u.username && (
                        <IconAction action={resetPlatformPasswordAction} icon="key" label="Cambiar clave" submitLabel="Cambiar clave" fields={{ userId: u.id }}>
                          <p className="text-sm text-muted">{u.username}</p>
                          <div><label className="label" htmlFor={`p${u.id}`}>Nueva clave</label><input id={`p${u.id}`} name="password" minLength={8} autoComplete="off" spellCheck={false} placeholder="Déjala vacía para generar una" className="input font-mono" /></div>
                        </IconAction>
                      )}
                      {u.id !== me && (
                        <IconAction action={setUserActiveAction} icon={u.active ? "person_off" : "person"} label={u.active ? "Desactivar cuenta" : "Activar cuenta"} tone={u.active ? "danger" : "default"}
                          confirm={u.active ? `¿Desactivar la cuenta de ${u.username ?? u.email}? No podrá ingresar hasta que la actives de nuevo.` : `¿Activar la cuenta de ${u.username ?? u.email}?`}
                          fields={{ userId: u.id, active: u.active ? "false" : "true" }} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
