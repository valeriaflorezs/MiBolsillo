import { notFound } from "next/navigation";
import { ActionForm } from "@/components/forms/action-form";
import { prisma } from "@/lib/db";
import { pageCtx } from "@/lib/auth/permissions";
import { inputDate, num } from "@/lib/format";
import { updateReservationAction } from "@/modules/airbnb/crud-actions";

export const metadata = { title: "Editar reserva" };

export default async function EditReservation({ params }: { params: Promise<{ workspaceId: string; resId: string }> }) {
  const { workspaceId, resId } = await params;
  await pageCtx(workspaceId, "airbnb:manage");
  const [r, properties] = await Promise.all([prisma.reservation.findFirst({ where: { id: resId, workspaceId } }), prisma.property.findMany({ where: { workspaceId }, select: { id: true, name: true } })]);
  if (!r) notFound();
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Editar reserva</h1>
      <section className="card max-w-3xl">
        <ActionForm action={updateReservationAction} submitLabel="Guardar cambios" resetOnSuccess={false}>
          <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="reservationId" value={r.id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label" htmlFor="propertyId">Propiedad</label><select id="propertyId" name="propertyId" defaultValue={r.propertyId} className="input">{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="label" htmlFor="channel">Canal</label><select id="channel" name="channel" defaultValue={r.channel} className="input"><option value="AIRBNB">Airbnb</option><option value="BOOKING">Booking</option><option value="DIRECT">Directo</option><option value="OTHER">Otro</option></select></div>
            <div><label className="label" htmlFor="guestName">Huésped</label><input id="guestName" name="guestName" defaultValue={r.guestName ?? ""} className="input" /></div>
            <div><label className="label" htmlFor="checkIn">Entrada</label><input id="checkIn" name="checkIn" type="date" required defaultValue={inputDate(r.checkIn)} className="input" /></div>
            <div><label className="label" htmlFor="checkOut">Salida</label><input id="checkOut" name="checkOut" type="date" required defaultValue={inputDate(r.checkOut)} className="input" /></div>
            <div><label className="label" htmlFor="externalCode">Código</label><input id="externalCode" name="externalCode" defaultValue={r.externalCode ?? ""} className="input" /></div>
            <div><label className="label" htmlFor="grossAmount">Ingreso por noches</label><input id="grossAmount" name="grossAmount" type="number" max="1000000000000" min="0" step="0.01" required defaultValue={num(r.grossAmount)} className="input" /></div>
            <div><label className="label" htmlFor="cleaningFeeCharged">Tarifa de aseo</label><input id="cleaningFeeCharged" name="cleaningFeeCharged" type="number" max="1000000000000" min="0" step="0.01" defaultValue={num(r.cleaningFeeCharged)} className="input" /></div>
            <div><label className="label" htmlFor="platformCommission">Comisión</label><input id="platformCommission" name="platformCommission" type="number" max="1000000000000" min="0" step="0.01" defaultValue={num(r.platformCommission)} className="input" /></div>
            <div><label className="label" htmlFor="payoutStatus">Cobro</label><select id="payoutStatus" name="payoutStatus" defaultValue={r.payoutStatus} className="input"><option value="PENDING">Por cobrar</option><option value="RECEIVED">Cobrado</option></select></div>
            <div><label className="label" htmlFor="status">Estado</label><select id="status" name="status" defaultValue={r.status} className="input"><option value="CONFIRMED">Confirmada</option><option value="COMPLETED">Completada</option><option value="CANCELLED">Cancelada</option></select></div>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
