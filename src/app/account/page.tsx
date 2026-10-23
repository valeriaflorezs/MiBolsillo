import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { Avatar } from "@/components/ui/avatar";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/permissions";
import { deleteMyAccountAction } from "@/modules/core/crud-actions";
import { WORKSPACE_TYPE_LABEL } from "@/modules/core/defaults";

export const metadata = { title: "Mi cuenta" };
export const dynamic = "force-dynamic";

export default async function Account() {
  const user = await requireUser();
  const mine = await prisma.workspaceMember.findMany({ where: { userId: user.id }, select: { role: true, workspace: { select: { id: true, name: true, type: true } } }, orderBy: { createdAt: "asc" } });
  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-6 px-4 py-8">
      <Link href="/" className="text-sm underline">‹ Volver</Link>
      <section className="card flex items-center gap-4"><Avatar name={user.name ?? user.email} image={user.image} size={56} /><div><h1 className="text-2xl font-semibold">{user.name ?? "Mi cuenta"}</h1><p className="text-muted">{user.email}</p></div></section>
      <section className="card space-y-3">
        <h2 className="font-medium">Mis negocios</h2>
        <ul className="divide-y divide-line">
          {mine.map((m) => <li key={m.workspace.id} className="flex items-center justify-between py-3"><Link className="font-medium underline" href={`/w/${m.workspace.id}`}>{m.workspace.name}</Link><span className="text-sm text-muted">{WORKSPACE_TYPE_LABEL[m.workspace.type]} · {m.role === "ADMIN" ? "Administrador" : "Operador"}</span></li>)}
          {mine.length === 0 && <li className="py-3 text-muted">Aún no tienes negocios.</li>}
        </ul>
      </section>
      <section className="card space-y-3">
        <h2 className="font-medium">Privacidad</h2>
        <p className="text-sm text-muted">Consulta cómo tratamos tus datos en la <Link className="underline" href="/privacidad">política de privacidad</Link>. Puedes exportar los movimientos de cada negocio en CSV desde la pestaña Movimientos.</p>
      </section>
      <section className="card space-y-3 border border-negative/30">
        <h2 className="font-medium text-negative">Eliminar mi cuenta</h2>
        <p className="text-sm text-muted">Se borra tu usuario. Los negocios donde eres el único administrador se eliminan por completo, con sus comprobantes. En negocios compartidos, los registros pasan a otro administrador. No se puede deshacer.</p>
        <ActionForm action={deleteMyAccountAction} submitLabel="Eliminar mi cuenta definitivamente" variant="ghost" resetOnSuccess={false}>
          <label className="label" htmlFor="confirm">Escribe tu correo ({user.email}) para confirmar</label>
          <input id="confirm" name="confirm" type="email" autoComplete="off" required className="input max-w-sm" />
        </ActionForm>
      </section>
    </main>
  );
}
