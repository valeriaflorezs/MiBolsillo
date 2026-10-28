import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { prisma } from "@/lib/db";
import { generatePassword } from "@/lib/auth/credentials";
import { CRED_DOMAIN } from "@/lib/auth/credentials-shared";
import { auth } from "@/lib/auth/config";
import { ROLE_LABEL } from "@/lib/auth/rbac";
import { fmtDateTime } from "@/lib/admin-range";
import { WORKSPACE_TYPE_LABEL } from "@/modules/core/defaults";
import { createPlatformUserAction, resetPlatformPasswordAction, setUserActiveAction } from "@/modules/admin/actions";

export const metadata = { title: "Administración · Empresas y usuarios" };

export default async function AdminHome() {
  const me = (await auth())?.user?.id;
  const [workspaces, users] = await Promise.all([
    prisma.workspace.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, type: true, archived: true, createdAt: true, _count: { select: { members: true, transactions: true } } } }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 500, select: { id: true, username: true, email: true, name: true, active: true, memberships: { select: { role: true, workspace: { select: { name: true } } } } } }),
  ]);
  const initial = generatePassword(11);

  return (
    <>
      <section className="card space-y-3">
        <h2 className="text-lg font-medium">Empresas</h2>
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
                  <td className="td text-right"><Link href={`/w/${w.id}`} className="text-sm underline">Abrir</Link></td>
                </tr>
              ))}
              {workspaces.length === 0 && <tr><td className="td text-muted" colSpan={7}>Aún no hay empresas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-medium">Usuarios</h2>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full">
            <thead><tr><th className="th">USUARIO</th><th className="th">NOMBRE</th><th className="th">EMPRESA</th><th className="th">ESTADO</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                  <td className="td">{u.username ?? (u.email.endsWith(CRED_DOMAIN) ? u.email : u.email)}</td>
                  <td className="td">{u.name ?? "—"}</td>
                  <td className="td">{u.memberships.length ? u.memberships.map((m) => `${m.workspace.name} (${ROLE_LABEL[m.role]})`).join(", ") : "—"}</td>
                  <td className="td">{u.active ? "Activo" : "Desactivado"}</td>
                  <td className="td">
                    <div className="flex flex-wrap items-start justify-end gap-2">
                      {u.username && (
                        <ActionForm action={resetPlatformPasswordAction} submitLabel="Nueva clave" variant="ghost" className="inline-flex" resetOnSuccess={false}>
                          <input type="hidden" name="userId" value={u.id} />
                        </ActionForm>
                      )}
                      {u.id !== me && (
                        <ActionForm action={setUserActiveAction} submitLabel={u.active ? "Desactivar" : "Activar"} variant="ghost" className="inline-flex" resetOnSuccess={false}>
                          <input type="hidden" name="userId" value={u.id} /><input type="hidden" name="active" value={u.active ? "false" : "true"} />
                        </ActionForm>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ActionForm action={createPlatformUserAction} submitLabel="Crear usuario" className="space-y-4">
          <fieldset className="space-y-3 rounded-xl border border-line p-4">
            <legend className="px-2 font-medium">Nuevo usuario</legend>
            <p className="text-sm text-muted">Crea una cuenta con usuario y clave, de solo lectura, en la empresa elegida. Las personas con Google se invitan desde los ajustes de cada empresa.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div><label className="label" htmlFor="nu">Usuario</label><input id="nu" name="username" required autoCapitalize="none" spellCheck={false} className="input" placeholder="nombre.apellido" /></div>
              <div><label className="label" htmlFor="nn">Nombre</label><input id="nn" name="name" required className="input" /></div>
              <div><label className="label" htmlFor="nw">Empresa</label><select id="nw" name="workspaceId" required className="input">{workspaces.filter((w) => !w.archived).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
              <div><label className="label" htmlFor="np">Clave inicial</label><input id="np" name="password" required minLength={8} defaultValue={initial} autoComplete="off" spellCheck={false} className="input font-mono" /></div>
            </div>
          </fieldset>
        </ActionForm>
      </section>
    </>
  );
}
