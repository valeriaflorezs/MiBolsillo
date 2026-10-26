import { ActionForm } from "@/components/forms/action-form";
import { prisma } from "@/lib/db";
import { pageCtx } from "@/lib/auth/permissions";
import { cop, num } from "@/lib/format";
import { addWishAction, toggleWishAction } from "@/modules/core/finance-actions";
import { DeleteButton } from "@/components/forms/delete-button";
import { deleteWishAction } from "@/modules/core/crud-actions";

export const metadata = { title: "Lista de deseos" };

export default async function Wishlist({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  await pageCtx(workspaceId, "transaction:create");
  const items = await prisma.plannedPurchase.findMany({ where: { workspaceId }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  const pending = items.filter((i) => i.status === "PENDING").reduce((a, i) => a + num(i.estimatedPrice), 0);
  return (
    <>
      <div><h1 className="text-3xl font-semibold tracking-tight">Lista de deseos</h1><p className="text-muted">Pendiente por comprar: {cop(pending)}</p></div>
      <section className="card max-w-3xl space-y-4">
        <ActionForm action={addWishAction} submitLabel="Agregar">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label" htmlFor="itemName">Artículo</label><input id="itemName" name="itemName" required className="input" /></div>
            <div><label className="label" htmlFor="store">Tienda</label><input id="store" name="store" className="input" /></div>
            <div><label className="label" htmlFor="estimatedPrice">Precio estimado</label><input id="estimatedPrice" name="estimatedPrice" type="number" max="1000000000000" min="0.01" step="0.01" required className="input" /></div>
          </div>
        </ActionForm>
      </section>
      <section className="card max-w-3xl !p-2">
        <ul className="divide-y divide-line">
          {items.length === 0 && <li className="p-6 text-center text-muted">Aún no hay artículos.</li>}
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 p-3">
              <div className={i.status === "PURCHASED" ? "text-muted line-through" : ""}>
                <p className="font-medium">{i.itemName}</p><p className="text-sm text-muted">{i.store ?? "—"} · {cop(num(i.estimatedPrice))}</p>
              </div>
              <div className="flex items-center gap-2">
                <ActionForm action={toggleWishAction} submitLabel={i.status === "PENDING" ? "Comprado" : "Deshacer"} variant="ghost" className="flex">
                  <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="wishId" value={i.id} />
                </ActionForm>
                <DeleteButton action={deleteWishAction} fields={{ workspaceId, wishId: i.id }} label="Quitar" confirmText="¿Quitar este artículo?" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
