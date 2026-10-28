import { notFound, redirect } from "next/navigation";
import { ActionForm } from "@/components/forms/action-form";
import { prisma } from "@/lib/db";
import { can, pageCtx } from "@/lib/auth/permissions";
import { canMutateTx } from "@/lib/auth/rbac";
import { inputDate } from "@/lib/format";
import { updateTransactionAction } from "@/modules/core/crud-actions";
import { accountOptions, categoryOptions, getTransactionDetail } from "@/modules/core/queries";

export const metadata = { title: "Editar movimiento" };

export default async function EditTransaction({ params }: { params: Promise<{ workspaceId: string; txId: string }> }) {
  const { workspaceId, txId } = await params;
  const ctx = await pageCtx(workspaceId, "transaction:create");
  const tx = await getTransactionDetail(workspaceId, txId, ctx.role, ctx.userId);
  if (!tx) notFound();
  if (!canMutateTx(ctx.role, { createdById: tx.createdById, type: tx.type, createdAt: tx.createdAt }, ctx.userId)) redirect(`/w/${workspaceId}/transactions?sel=${txId}`);
  const admin = can(ctx.role, "dashboard:full");
  const [accounts, categories] = await Promise.all([accountOptions(workspaceId), categoryOptions(workspaceId)]);
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Editar movimiento</h1>
      <section className="card max-w-3xl">
        <ActionForm action={updateTransactionAction} submitLabel="Guardar cambios" resetOnSuccess={false}>
          <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="transactionId" value={txId} />
          <div className="grid gap-5 sm:grid-cols-2">
            {admin ? (
              <div><label className="label" htmlFor="type">Tipo</label><select id="type" name="type" defaultValue={tx.type} className="input"><option value="EXPENSE">Gasto</option><option value="INCOME">Ingreso</option><option value="TRANSFER">Transferencia</option></select></div>
            ) : <input type="hidden" name="type" value="EXPENSE" />}
            <div><label className="label" htmlFor="amount">Monto</label><input id="amount" name="amount" type="number" max="1000000000000" min="0.01" step="0.01" required defaultValue={tx.amount} className="input" /></div>
            <div><label className="label" htmlFor="quantity">Cantidad (opcional)</label><input id="quantity" name="quantity" type="number" max="10000000" min="0.001" step="0.001" defaultValue={tx.quantity ?? undefined} className="input" placeholder="Unidades compradas" /></div>
            <div><label className="label" htmlFor="date">Fecha</label><input id="date" name="date" type="date" required defaultValue={inputDate(tx.date)} className="input" /></div>
            <div><label className="label" htmlFor="status">Estado</label><select id="status" name="status" defaultValue={tx.status} className="input"><option value="PAID">Pagado</option><option value="PENDING">Por pagar</option></select></div>
            <div><label className="label" htmlFor="vendor">Proveedor</label><input id="vendor" name="vendor" maxLength={80} defaultValue={tx.vendor ?? ""} className="input" /></div>
            <div><label className="label" htmlFor="categoryId">Categoría</label><select id="categoryId" name="categoryId" defaultValue={tx.categoryId ?? ""} className="input"><option value="">Sin categoría</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select></div>
            <div><label className="label" htmlFor="accountId">Cuenta</label><select id="accountId" name="accountId" defaultValue={tx.accountId} className="input">{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            {admin && <div><label className="label" htmlFor="transferAccountId">Cuenta destino</label><select id="transferAccountId" name="transferAccountId" defaultValue={tx.transferAccountId ?? ""} className="input"><option value="">—</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}
          </div>
          <div><label className="label" htmlFor="description">Nota</label><input id="description" name="description" maxLength={300} defaultValue={tx.description ?? ""} className="input" /></div>
        </ActionForm>
      </section>
    </>
  );
}
