import { ActionForm } from "@/components/forms/action-form";
import { FormDialog } from "@/components/forms/form-dialog";
import { IconAction } from "@/components/forms/icon-action";
import { prisma } from "@/lib/db";
import { pageCtx } from "@/lib/auth/permissions";
import { cop, num } from "@/lib/format";
import { addWishAction, toggleWishAction } from "@/modules/core/finance-actions";
import { deleteWishAction } from "@/modules/core/crud-actions";

export const metadata = { title: "Lista de deseos" };

export default async function Wishlist({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  await pageCtx(workspaceId, "transaction:create");
  const items = await prisma.plannedPurchase.findMany({ where: { workspaceId }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  const pending = items.filter((i) => i.status === "PENDING").reduce((a, i) => a + num(i.estimatedPrice), 0);
  return (
    <>
      <div className="flex max-w-3xl items-start justify-between gap-3">
        <div><h1 className="text-3xl font-semibold tracking-tight">Lista de deseos</h1><p className="text-muted">Pendiente por comprar: {cop(pending)}</p></div>
        <FormDialog label="Agregar artículo" title="Agregar artículo">
          <ActionForm action={addWishAction} submitLabel="Agregar">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <div className="space-y-3">
              <div><label className="label" htmlFor="itemName">Artículo</label><input id="itemName" name="itemName" required className="input" /></div>
              <div><label className="label" htmlFor="store">Tienda</label><input id="store" name="store" className="input" /></div>
              <div><label className="label" htmlFor="estimatedPrice">Precio estimado</label><input id="estimatedPrice" name="estimatedPrice" type="number" max="1000000000000" min="0.01" step="0.01" required className="input" /></div>
            </div>
          </ActionForm>
        </FormDialog>
      </div>
      <section className="card max-w-3xl !p-2">
        <ul className="divide-y divide-line">
          {items.length === 0 && <li className="p-6 text-center text-muted">Aún no hay artículos.</li>}
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 p-3">
              <div className={i.status === "PURCHASED" ? "text-muted line-through" : ""}>
                <p className="font-medium">{i.itemName}</p><p className="text-sm text-muted">{i.store ?? "—"} · {cop(num(i.estimatedPrice))}</p>
              </div>
              <div className="flex items-center gap-2">
                <IconAction action={toggleWishAction} icon={i.status === "PENDING" ? "check" : "undo"} label={i.status === "PENDING" ? "Marcar como comprado" : "Deshacer"} fields={{ workspaceId, wishId: i.id }} />
                <IconAction action={deleteWishAction} icon="delete" label="Quitar artículo" tone="danger" confirm="¿Quitar este artículo de la lista?" fields={{ workspaceId, wishId: i.id }} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
