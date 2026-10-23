import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { DeleteButton } from "@/components/forms/delete-button";
import { Chip } from "@/components/ui/chip";
import { FolderCard } from "@/components/ui/folder-card";
import { MonthNav } from "@/components/ui/filters";
import { prisma } from "@/lib/db";
import { pageCtx } from "@/lib/auth/permissions";
import { cop, fmtDate, inputDate, monthRange, num } from "@/lib/format";
import { createReservationAction, reservationStatusAction } from "@/modules/airbnb/actions";
import { deleteReservationAction } from "@/modules/airbnb/crud-actions";

export const metadata = { title: "Reservas" };
const DAY = 86_400_000;
const CHANNEL = { AIRBNB: "Airbnb", BOOKING: "Booking", DIRECT: "Directo", OTHER: "Otro" } as const;

export default async function Reservations({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ month?: string; sel?: string }> }) {
  const { workspaceId } = await params;
  const sp = await searchParams;
  await pageCtx(workspaceId, "airbnb:manage");
  const { key, start, end } = monthRange(sp.month);
  const [rows, properties] = await Promise.all([
    prisma.reservation.findMany({ where: { workspaceId, checkIn: { gte: start, lt: end } }, include: { property: { select: { name: true } } }, orderBy: { checkIn: "asc" } }),
    prisma.property.findMany({ where: { workspaceId, active: true }, select: { id: true, name: true } }),
  ]);
  const sel = rows.find((r) => r.id === (sp.sel ?? rows[0]?.id)) ?? (sp.sel ? await prisma.reservation.findFirst({ where: { id: sp.sel, workspaceId }, include: { property: { select: { name: true } } } }) : null);
  const live = rows.filter((r) => r.status !== "CANCELLED");
  const total = (r: (typeof rows)[number]) => num(r.grossAmount) + num(r.cleaningFeeCharged);
  const gross = live.reduce((a, r) => a + total(r), 0);
  const pending = live.filter((r) => r.payoutStatus === "PENDING").reduce((a, r) => a + total(r) - num(r.platformCommission), 0);
  const base = `/w/${workspaceId}/reservations`;
  const nights = sel ? Math.max(1, Math.round((sel.checkOut.getTime() - sel.checkIn.getTime()) / DAY)) : 0;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-semibold tracking-tight">Reservas</h1><p className="text-muted">Ingresos del mes <strong className="text-ink">{cop(gross)}</strong> · Por cobrar <strong className="text-ink">{cop(pending)}</strong></p></div>
        <a href="#nueva" className="btn btn-primary">+ Nueva reserva</a>
      </div>
      <MonthNav base={base} month={key} />

      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <section className="panel space-y-1.5 !p-3 sm:!p-4" aria-label="Reservas del mes">
          {rows.length === 0 && <p className="p-6 text-center text-white/70">Sin reservas con entrada este mes.</p>}
          {rows.map((r) => (
            <Link key={r.id} href={`${base}?month=${key}&sel=${r.id}`} aria-current={sel?.id === r.id ? "true" : undefined} className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm ${sel?.id === r.id ? "bg-brand shadow-glow" : "border border-white/10 bg-white/10 hover:bg-white/20"} ${r.status === "CANCELLED" ? "opacity-60" : ""}`}>
              <span className="min-w-0"><span className="block truncate font-medium">{r.guestName ?? "Huésped"}</span><span className="block text-xs text-white/60">{fmtDate(r.checkIn)} → {fmtDate(r.checkOut)} · {r.property.name}</span></span>
              <span className="shrink-0 text-right"><span className="block font-medium">{cop(total(r))}</span><span className="text-xs text-white/60">{r.status === "CANCELLED" ? "Cancelada" : r.payoutStatus === "RECEIVED" ? "Cobrada" : "Por cobrar"}</span></span>
            </Link>
          ))}
        </section>

        <FolderCard className="min-h-64" tab={sel ? CHANNEL[sel.channel] : "Detalle"} meta={sel ? <>{fmtDate(sel.checkIn)} → {fmtDate(sel.checkOut)}</> : undefined}>
          {!sel ? <p className="py-12 text-center text-muted">Selecciona una reserva para ver su detalle.</p> : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><div className="flex flex-wrap gap-2"><Chip tone="brand">{CHANNEL[sel.channel]}</Chip>{sel.status === "CANCELLED" ? <Chip tone="negative">Cancelada</Chip> : <Chip tone={sel.payoutStatus === "RECEIVED" ? "positive" : "neutral"}>{sel.payoutStatus === "RECEIVED" ? "Cobrada" : "Por cobrar"}</Chip>}</div>
                  <p className="mt-3 text-2xl font-semibold">{sel.guestName ?? "Huésped"}</p><p className="text-muted">{sel.property.name} · {fmtDate(sel.checkIn)} → {fmtDate(sel.checkOut)} · {nights} noche(s)</p></div>
                <p className="text-right text-sm text-muted">Neto para ti<span className="block text-3xl font-semibold text-ink">{cop(num(sel.grossAmount) + num(sel.cleaningFeeCharged) - num(sel.platformCommission))}</span></p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[["Noches", num(sel.grossAmount)], ["Tarifa de aseo", num(sel.cleaningFeeCharged)], ["Comisión", -num(sel.platformCommission)]].map(([l, v]) => (
                  <div key={l as string} className="rounded-2xl bg-white/40 p-4"><p className="text-sm text-muted">{l}</p><p className="mt-1 text-lg font-semibold">{cop(v as number)}</p></div>
                ))}
              </div>
              <p className="text-sm text-muted">Tarifa media por noche: <strong className="text-ink">{cop(num(sel.grossAmount) / nights)}</strong>{sel.externalCode && <> · Código {sel.externalCode}</>}</p>
              <div className="flex flex-wrap items-center gap-2">
                {sel.status !== "CANCELLED" && sel.payoutStatus === "PENDING" && <ActionForm action={reservationStatusAction} submitLabel="Marcar cobrada" className="flex"><input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="reservationId" value={sel.id} /><input type="hidden" name="intent" value="received" /></ActionForm>}
                {sel.status !== "CANCELLED" && <ActionForm action={reservationStatusAction} submitLabel="Cancelar reserva" variant="ghost" className="flex"><input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="reservationId" value={sel.id} /><input type="hidden" name="intent" value="cancel" /></ActionForm>}
                <Link href={`${base}/${sel.id}/edit`} className="btn btn-ghost">Editar</Link>
                <DeleteButton action={deleteReservationAction} fields={{ workspaceId, reservationId: sel.id }} confirmText="¿Eliminar esta reserva?" />
              </div>
            </div>
          )}
        </FolderCard>
      </div>

      <section id="nueva" className="card space-y-4">
        <h2 className="font-medium">Nueva reserva</h2>
        <ActionForm action={createReservationAction} submitLabel="Guardar reserva">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label" htmlFor="propertyId">Propiedad</label><select id="propertyId" name="propertyId" className="input">{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="label" htmlFor="channel">Canal</label><select id="channel" name="channel" className="input">{Object.entries(CHANNEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label" htmlFor="guestName">Huésped</label><input id="guestName" name="guestName" className="input" /></div>
            <div><label className="label" htmlFor="checkIn">Entrada</label><input id="checkIn" name="checkIn" type="date" required defaultValue={inputDate(start)} className="input" /></div>
            <div><label className="label" htmlFor="checkOut">Salida</label><input id="checkOut" name="checkOut" type="date" required className="input" /></div>
            <div><label className="label" htmlFor="externalCode">Código de reserva</label><input id="externalCode" name="externalCode" className="input" /></div>
            <div><label className="label" htmlFor="grossAmount">Ingreso por noches</label><input id="grossAmount" name="grossAmount" type="number" min="0" step="any" required className="input" /></div>
            <div><label className="label" htmlFor="cleaningFeeCharged">Tarifa de aseo cobrada</label><input id="cleaningFeeCharged" name="cleaningFeeCharged" type="number" min="0" step="any" defaultValue={0} className="input" /></div>
            <div><label className="label" htmlFor="platformCommission">Comisión plataforma</label><input id="platformCommission" name="platformCommission" type="number" min="0" step="any" defaultValue={0} className="input" /></div>
            <div><label className="label" htmlFor="payoutStatus">Cobro</label><select id="payoutStatus" name="payoutStatus" className="input"><option value="PENDING">Por cobrar</option><option value="RECEIVED">Cobrado</option></select></div>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
