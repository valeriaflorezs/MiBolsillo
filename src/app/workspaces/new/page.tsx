import { ActionForm } from "@/components/forms/action-form";
import { Logo } from "@/components/ui/logo";
import { createWorkspaceAction } from "@/modules/core/actions";
import { WORKSPACE_TYPE_LABEL } from "@/modules/core/defaults";
import { requireUser } from "@/lib/auth/permissions";

export const metadata = { title: "Nuevo negocio" };

export default async function NewWorkspace() {
  await requireUser();
  return (
    <main className="mx-auto min-h-screen max-w-lg space-y-6 px-4 py-10">
      <Logo height={34} />
      <section className="card space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Crea tu negocio</h1>
          <p className="mt-1 text-muted">Un negocio es un espacio separado: por ejemplo “Apto 302” o “Finanzas personales”.</p>
        </div>
        <ActionForm action={createWorkspaceAction} submitLabel="Crear negocio" resetOnSuccess={false}>
          <div>
            <label className="label" htmlFor="name">Nombre</label>
            <input id="name" name="name" required minLength={2} maxLength={60} className="input" placeholder="Airbnb Apto 302" />
          </div>
          <div>
            <label className="label" htmlFor="type">Tipo</label>
            <select id="type" name="type" className="input" defaultValue="AIRBNB">
              {Object.entries(WORKSPACE_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="propertyName">Nombre de la propiedad <span className="font-normal text-muted">(solo Airbnb)</span></label>
            <input id="propertyName" name="propertyName" maxLength={80} className="input" placeholder="Apto 302" />
          </div>
        </ActionForm>
      </section>
    </main>
  );
}
