import { ActionForm } from "@/components/forms/action-form";
import { Filters } from "@/components/ui/filters";
import { prisma } from "@/lib/db";
import { pageCtx } from "@/lib/auth/permissions";
import { cop, fmtDate, inputDate, monthRange, num } from "@/lib/format";
import { createReservationAction, reservationStatusAction } from "@/modules/airbnb/actions";

export const metadata = { title: "Reservas" };

export default async function Reservations({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ month?: string }> }) {
  const { workspaceId } = await params;
  await pageCtx(workspaceId, "airbnb:manage");
  const { key, start, end } = monthRange((await searchParams).month);
  const [rows, properties] = await Promise.all([
    prisma.reservation.findMany({ where: { workspaceId, checkIn: { gte: start, lt: end } }, include: { property: { select: { name: true } } }, orderBy: { checkIn: "asc" } }),
    prisma.property.findMany({ where: { workspaceId }, select: { id: true, name: true } }),
  ]);
  const live = rows.filter((r) => r.status !== "CANCELLED");
  const gross = live.reduce((a, r) => a + num(r.grossAmount) + num(r.cleaningFeeCharged), 0);
  const pending = live.filter((r) => r.payoutStatus === "PENDING").reduce((a, r) => a + num(r.grossAmount) + num(r.cleaningFeeCharged) - num(r.platformCommission), 0);
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Reservas</h1>
      <Filters base={`/w/${workspaceId}/reservations`} month={key} showStatus={false} />
      <p className="text-muted">Ingresos del mes: <strong className="text-ink">{cop(gross)}</strong> · Por cobrar: <strong className="text-ink">{cop(pending)}</strong></p>
      <section className="card overflow-x-auto !p-2">
        {rows.length === 0 ? <p className="p-6 text-center text-muted">Sin reservas con entrada este mes.</p> : (
          <table className="w-full">
            <thead><tr><th className="th">Huésped</th><th className="th">Estadía</th><th className="th text-right">Ingreso</th><th className="th text-right">Comisión</th><th className="th">Cobro</th><th className="th"><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className={r.status === "CANCELLED" ? "text-muted line-through" : ""}>
                  <td className="td">{r.guestName ?? "—"}<p className="text-xs text-muted">{r.property.name} · {r.channel}</p></td>
                  <td className="td whitespace-nowrap">{fmtDate(r.checkIn)} → {fmtDate(r.checkOut)}</td>
                  <td className="td text-right">{cop(num(r.grossAmount) + num(r.cleaningFeeCharged))}</td>
                  <td className="td text-right">{cop(num(r.platformCommission))}</td>
                  <td className="td">{r.status === "CANCELLED" ? "Cancelada" : r.payoutStatus === "RECEIVED" ? "Cobrada" : "Por cobrar"}</td>
                  <td className="td">
                    {r.status !== "CANCELLED" && (
                      <div className="flex gap-2">
                        {r.payoutStatus === "PENDING" && <ActionForm action={reservationStatusAction} submitLabel="Cobrada" className="flex"><input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="reservationId" value={r.id} /><input type="hidden" name="intent" value="received" /></ActionForm>}
                        <ActionForm action={reservationStatusAction} submitLabel="Cancelar" variant="ghost" className="flex"><input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="reservationId" value={r.id} /><input type="hidden" name="intent" value="cancel" /></ActionForm>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="card space-y-4">
        <h2 className="font-medium">Nueva reserva</h2>
        <ActionForm action={createReservationAction} submitLabel="Guardar reserva">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label" htmlFor="propertyId">Propiedad</label><select id="propertyId" name="propertyId" className="input">{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="label" htmlFor="channel">Canal</label><select id="channel" name="channel" className="input"><option value="AIRBNB">Airbnb</option><option value="BOOKING">Booking</option><option value="DIRECT">Directo</option><option value="OTHER">Otro</option></select></div>
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
