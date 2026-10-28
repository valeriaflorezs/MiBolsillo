import { notFound } from "next/navigation";
import { ActionForm } from "@/components/forms/action-form";
import { IconAction } from "@/components/forms/icon-action";
import { prisma } from "@/lib/db";
import { pageCtx } from "@/lib/auth/permissions";
import { num } from "@/lib/format";
import { deleteFixedExpenseAction, updateFixedExpenseAction } from "@/modules/airbnb/crud-actions";

export const metadata = { title: "Editar gasto fijo" };
const CONCEPT = { HOA: "Administración (HOA)", UTILITIES: "Servicios públicos", SUBSCRIPTIONS: "Suscripciones", MAINTENANCE: "Mantenimiento", OTHER: "Otro" } as const;
const FREQ = { MONTHLY: "Mensual", BIMONTHLY: "Bimestral", QUARTERLY: "Trimestral", SEMIANNUAL: "Semestral", ANNUAL: "Anual" } as const;

export default async function EditFixed({ params }: { params: Promise<{ workspaceId: string; fixedId: string }> }) {
  const { workspaceId, fixedId } = await params;
  await pageCtx(workspaceId, "airbnb:manage");
  const [f, properties] = await Promise.all([prisma.fixedExpense.findFirst({ where: { id: fixedId, workspaceId } }), prisma.property.findMany({ where: { workspaceId }, select: { id: true, name: true } })]);
  if (!f) notFound();
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Editar gasto fijo</h1>
      <section className="card max-w-3xl space-y-4">
        <ActionForm action={updateFixedExpenseAction} submitLabel="Guardar cambios" resetOnSuccess={false}>
          <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="fixedId" value={f.id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label" htmlFor="propertyId">Propiedad</label><select id="propertyId" name="propertyId" defaultValue={f.propertyId} className="input">{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="label" htmlFor="concept">Concepto</label><select id="concept" name="concept" defaultValue={f.concept} className="input">{Object.entries(CONCEPT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label" htmlFor="name">Nombre</label><input id="name" name="name" required defaultValue={f.name} className="input" /></div>
            <div><label className="label" htmlFor="amount">Monto</label><input id="amount" name="amount" type="number" max="1000000000000" min="0.01" step="0.01" required defaultValue={num(f.amount)} className="input" /></div>
            <div><label className="label" htmlFor="frequency">Frecuencia</label><select id="frequency" name="frequency" defaultValue={f.frequency} className="input">{Object.entries(FREQ).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label" htmlFor="dayOfMonth">Día del mes</label><input id="dayOfMonth" name="dayOfMonth" type="number" min="1" max="28" defaultValue={f.dayOfMonth ?? 1} className="input" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={f.active} />Activo</label>
        </ActionForm>
        <IconAction action={deleteFixedExpenseAction} fields={{ workspaceId, fixedId: f.id }} icon="delete" tone="danger" label="Eliminar" confirm="¿Eliminar este gasto fijo? Los movimientos ya generados se conservan." />
      </section>
    </>
  );
}
