import { notFound } from "next/navigation";
import { ActionForm } from "@/components/forms/action-form";
import { DeleteButton } from "@/components/forms/delete-button";
import { prisma } from "@/lib/db";
import { pageCtx } from "@/lib/auth/permissions";
import { num } from "@/lib/format";
import { deleteCapexItemAction, updateCapexItemAction } from "@/modules/airbnb/crud-actions";

export const metadata = { title: "Editar ítem CAPEX" };
const CAT = { FURNITURE: "Muebles", APPLIANCES: "Electrodomésticos", RENOVATION: "Reformas", DECOR: "Decoración", LINENS_KITCHENWARE: "Ropa de cama y cocina", TECH: "Tecnología", OTHER: "Otros" } as const;

export default async function EditCapex({ params }: { params: Promise<{ workspaceId: string; itemId: string }> }) {
  const { workspaceId, itemId } = await params;
  await pageCtx(workspaceId, "airbnb:manage");
  const [i, properties] = await Promise.all([prisma.capexItem.findFirst({ where: { id: itemId, workspaceId } }), prisma.property.findMany({ where: { workspaceId }, select: { id: true, name: true } })]);
  if (!i) notFound();
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Editar ítem</h1>
      <section className="card max-w-3xl space-y-4">
        <ActionForm action={updateCapexItemAction} submitLabel="Guardar cambios" resetOnSuccess={false}>
          <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="itemId" value={i.id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label" htmlFor="propertyId">Propiedad</label><select id="propertyId" name="propertyId" defaultValue={i.propertyId} className="input">{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="label" htmlFor="capexCategory">Categoría</label><select id="capexCategory" name="capexCategory" defaultValue={i.capexCategory} className="input">{Object.entries(CAT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label" htmlFor="itemDescription">Descripción</label><input id="itemDescription" name="itemDescription" required defaultValue={i.itemDescription} className="input" /></div>
            <div><label className="label" htmlFor="quantity">Cantidad</label><input id="quantity" name="quantity" type="number" min="1" defaultValue={i.quantity} className="input" /></div>
            <div><label className="label" htmlFor="budgetedUnitPrice">Precio unitario presupuestado</label><input id="budgetedUnitPrice" name="budgetedUnitPrice" type="number" min="0" step="any" required defaultValue={num(i.budgetedUnitPrice)} className="input" /></div>
            <div><label className="label" htmlFor="store">Tienda</label><input id="store" name="store" defaultValue={i.store ?? ""} className="input" /></div>
          </div>
        </ActionForm>
        <DeleteButton action={deleteCapexItemAction} fields={{ workspaceId, itemId: i.id }} confirmText="¿Eliminar este ítem del CAPEX?" />
      </section>
    </>
  );
}
