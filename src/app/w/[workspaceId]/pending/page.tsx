import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { Chip } from "@/components/ui/chip";
import { FolderCard } from "@/components/ui/folder-card";
import { prisma } from "@/lib/db";
import { can, pageCtx } from "@/lib/auth/permissions";
import { cop, fmtDate, num, todayUtc } from "@/lib/format";
import { reservationStatusAction } from "@/modules/airbnb/actions";
import { markPaidAction } from "@/modules/core/finance-actions";
import { pendingPayables } from "@/modules/core/queries";

export const metadata = { title: "Pendientes" };

export default async function Pending({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const ctx = await pageCtx(workspaceId, "transaction:create");
  const today = todayUtc();
  const [rows, receivables] = await Promise.all([
    pendingPayables(workspaceId, ctx.role, ctx.userId, 100),
    can(ctx.role, "airbnb:manage") ? prisma.reservation.findMany({ where: { workspaceId, status: { not: "CANCELLED" }, payoutStatus: "PENDING" }, include: { property: { select: { name: true } } }, orderBy: { checkIn: "asc" }, take: 50 }) : [],
  ]);
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
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/40 px-4 py-3">
            <Link href={`/w/${workspaceId}/transactions?sel=${t.id}&month=${t.date.toISOString().slice(0, 7)}`} className="min-w-0">
              <p className="truncate font-medium">{t.category?.emoji} {t.vendor ?? t.category?.name ?? "Gasto"}</p>
              <p className="text-sm text-muted">{fmtDate(t.date)} {overdue(t.date) && <Chip tone="negative">Vencido</Chip>}</p>
            </Link>
            <div className="flex items-center gap-3"><strong>{cop(t.amount)}</strong>
              <ActionForm action={markPaidAction} submitLabel="Pagado" variant="ghost" className="flex"><input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="transactionId" value={t.id} /></ActionForm></div>
          </div>
        ))}
        </div>
      </FolderCard>
      {(incoming.length > 0 || receivables.length > 0) && (
        <FolderCard tab="Por cobrar" meta={<>{incoming.length + receivables.length} pendiente(s)</>}>
          <div className="space-y-2">
          {incoming.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/40 px-4 py-3"><span>{t.vendor ?? t.category?.name ?? "Ingreso"} <span className="text-sm text-muted">· {fmtDate(t.date)}</span></span>
              <div className="flex items-center gap-3"><strong>{cop(t.amount)}</strong><ActionForm action={markPaidAction} submitLabel="Cobrado" variant="ghost" className="flex"><input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="transactionId" value={t.id} /></ActionForm></div></div>
          ))}
          {receivables.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/40 px-4 py-3"><span>{r.guestName ?? "Reserva"} <span className="text-sm text-muted">· {r.property.name} · {fmtDate(r.checkIn)}</span></span>
              <div className="flex items-center gap-3"><strong>{cop(num(r.grossAmount) + num(r.cleaningFeeCharged) - num(r.platformCommission))}</strong><ActionForm action={reservationStatusAction} submitLabel="Cobrada" variant="ghost" className="flex"><input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="reservationId" value={r.id} /><input type="hidden" name="intent" value="received" /></ActionForm></div></div>
          ))}
          </div>
        </FolderCard>
      )}
    </>
  );
}
