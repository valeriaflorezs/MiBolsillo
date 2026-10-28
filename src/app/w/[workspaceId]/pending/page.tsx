import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { Chip } from "@/components/ui/chip";
import { FolderCard } from "@/components/ui/folder-card";
import { can, pageCtx } from "@/lib/auth/permissions";
import { cop, fmtDate, todayUtc, txTitle, txVendorHint } from "@/lib/format";
import { markPaidAction } from "@/modules/core/finance-actions";
import { pendingPayables } from "@/modules/core/queries";

export const metadata = { title: "Pendientes" };

export default async function Pending({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const ctx = await pageCtx(workspaceId, "data:read");
  const canWrite = can(ctx.role, "transaction:create");
  const today = todayUtc();
  const rows = await pendingPayables(workspaceId, ctx.role, ctx.userId, 100);
  const pay = rows.filter((r) => r.type === "EXPENSE");
  const incoming = rows.filter((r) => r.type === "INCOME");
  const overdue = (d: Date) => d < today;
  return (
    <>
      <div><h1 className="text-3xl font-semibold tracking-tight">Pendientes</h1><p className="text-muted">Lo que debes pagar y lo que te deben.</p></div>
      <FolderCard tab="Por pagar" meta={<>{cop(pay.reduce((a, r) => a + r.amount, 0))}</>}>
        <div className="space-y-2">
        {pay.length === 0 && <p className="text-sm text-muted">Nada por pagar 🎉</p>}
        {pay.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl inset px-4 py-3">
            <Link href={`/w/${workspaceId}/transactions?sel=${t.id}&month=${t.date.toISOString().slice(0, 7)}`} className="min-w-0">
              <p className="truncate font-medium">{t.category?.emoji} {txTitle(t, "Gasto", t.category?.name)}</p>
              <p className="text-sm text-muted">{txVendorHint(t) ? `${txVendorHint(t)} · ` : ""}{fmtDate(t.date)} {overdue(t.date) && <Chip tone="negative">Vencido</Chip>}</p>
            </Link>
            <div className="flex items-center gap-3"><strong>{cop(t.amount)}</strong>
              {canWrite && <ActionForm action={markPaidAction} submitLabel="Pagado" variant="ghost" className="flex"><input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="transactionId" value={t.id} /></ActionForm>}</div>
          </div>
        ))}
        </div>
      </FolderCard>
      {incoming.length > 0 && (
        <FolderCard tab="Por cobrar" meta={<>{incoming.length} pendiente(s)</>}>
          <div className="space-y-2">
          {incoming.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl inset px-4 py-3"><span>{txTitle(t, "Ingreso", t.category?.name)} <span className="text-sm text-muted">· {fmtDate(t.date)}</span></span>
              <div className="flex items-center gap-3"><strong>{cop(t.amount)}</strong>{canWrite && <ActionForm action={markPaidAction} submitLabel="Cobrado" variant="ghost" className="flex"><input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="transactionId" value={t.id} /></ActionForm>}</div></div>
          ))}
          </div>
        </FolderCard>
      )}
    </>
  );
}
