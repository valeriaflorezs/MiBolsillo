import { ActionForm } from "@/components/forms/action-form";
import { FormDialog } from "@/components/forms/form-dialog";
import { Chip } from "@/components/ui/chip";
import { prisma } from "@/lib/db";
import { pageCtx } from "@/lib/auth/permissions";
import { createPropertyAction } from "@/modules/airbnb/actions";
import { updatePropertyAction } from "@/modules/airbnb/crud-actions";

export const metadata = { title: "Propiedades" };

export default async function Properties({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  await pageCtx(workspaceId, "airbnb:manage");
  const props = await prisma.property.findMany({ where: { workspaceId }, orderBy: [{ active: "desc" }, { createdAt: "asc" }], include: { _count: { select: { capexItems: true, fixedExpenses: true } } } });
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Propiedades</h1>
        <FormDialog label="Nueva propiedad" title="Nueva propiedad">
          <ActionForm action={createPropertyAction} submitLabel="Crear propiedad"><input type="hidden" name="workspaceId" value={workspaceId} />
            <div className="space-y-3"><div><label className="label" htmlFor="name">Nombre</label><input id="name" name="name" required className="input" /></div><div><label className="label" htmlFor="address">Dirección</label><input id="address" name="address" className="input" /></div></div>
          </ActionForm>
        </FormDialog>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {props.map((p) => (
          <section key={p.id} className={p.active ? "card space-y-3" : "card space-y-3 opacity-60"}>
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-medium">{p.name}</h2><p className="text-sm text-muted">{p.address ?? "Sin dirección"}</p></div>{!p.active && <Chip>Inactiva</Chip>}</div>
            <p className="text-sm text-muted">{p._count.capexItems} ítems CAPEX · {p._count.fixedExpenses} gastos fijos</p>
            <details><summary className="cursor-pointer text-sm underline">Editar</summary>
              <ActionForm action={updatePropertyAction} submitLabel="Guardar" resetOnSuccess={false} className="mt-3 space-y-3">
                <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="propertyId" value={p.id} />
                <div><label className="label" htmlFor={`pn${p.id}`}>Nombre</label><input id={`pn${p.id}`} name="name" defaultValue={p.name} required className="input" /></div>
                <div><label className="label" htmlFor={`pa${p.id}`}>Dirección</label><input id={`pa${p.id}`} name="address" defaultValue={p.address ?? ""} className="input" /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p.active} />Activa (cuenta para la ocupación)</label>
              </ActionForm>
            </details>
          </section>
        ))}
      </div>
    </>
  );
}
