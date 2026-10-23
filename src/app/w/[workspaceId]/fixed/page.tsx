import { ActionForm } from "@/components/forms/action-form";
import { Filters } from "@/components/ui/filters";
import { prisma } from "@/lib/db";
import { pageCtx } from "@/lib/auth/permissions";
import { cop, monthRange, num } from "@/lib/format";
import { createFixedExpenseAction, generateFixedAction, toggleFixedAction } from "@/modules/airbnb/actions";

export const metadata = { title: "Gastos fijos" };
const CONCEPT = { HOA: "Administración (HOA)", UTILITIES: "Servicios públicos", SUBSCRIPTIONS: "Suscripciones", MAINTENANCE: "Mantenimiento", OTHER: "Otro" } as const;
const FREQ = { MONTHLY: "Mensual", BIMONTHLY: "Bimestral", QUARTERLY: "Trimestral", SEMIANNUAL: "Semestral", ANNUAL: "Anual" } as const;

export default async function Fixed({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ month?: string }> }) {
  const { workspaceId } = await params;
  await pageCtx(workspaceId, "airbnb:manage");
  const { key } = monthRange((await searchParams).month);
  const [rows, properties] = await Promise.all([
    prisma.fixedExpense.findMany({ where: { workspaceId }, include: { property: { select: { name: true } } }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.property.findMany({ where: { workspaceId }, select: { id: true, name: true } }),
  ]);
  const monthly = rows.filter((r) => r.active && r.frequency === "MONTHLY").reduce((a, r) => a + num(r.amount), 0);
  return (
    <>
      <div><h1 className="text-3xl font-semibold tracking-tight">Gastos fijos (OPEX)</h1><p className="text-muted">Mensual recurrente: {cop(monthly)}</p></div>
      <section className="card flex flex-wrap items-center justify-between gap-3">
        <Filters base={`/w/${workspaceId}/fixed`} month={key} showStatus={false} />
        <ActionForm action={generateFixedAction} submitLabel="Generar gastos del mes" variant="ghost" resetOnSuccess={false} className="flex items-center gap-3">
          <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="month" value={key} />
        </ActionForm>
      </section>
      <section className="card overflow-x-auto !p-2">
        {rows.length === 0 ? <p className="p-6 text-center text-muted">Aún no hay gastos fijos.</p> : (
          <table className="w-full">
            <thead><tr><th className="th">Gasto</th><th className="th">Concepto</th><th className="th">Frecuencia</th><th className="th text-right">Monto</th><th className="th"><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className={r.active ? "" : "text-muted"}>
                  <td className="td">{r.name}<p className="text-xs text-muted">{r.property.name}</p></td>
                  <td className="td">{CONCEPT[r.concept]}</td><td className="td">{FREQ[r.frequency]}</td>
                  <td className="td text-right">{cop(num(r.amount))}</td>
                  <td className="td"><ActionForm action={toggleFixedAction} submitLabel={r.active ? "Pausar" : "Activar"} variant="ghost" className="flex"><input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="fixedId" value={r.id} /></ActionForm></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="card space-y-4">
        <h2 className="font-medium">Nuevo gasto fijo</h2>
        <ActionForm action={createFixedExpenseAction} submitLabel="Crear">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label" htmlFor="propertyId">Propiedad</label><select id="propertyId" name="propertyId" className="input">{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="label" htmlFor="concept">Concepto</label><select id="concept" name="concept" className="input">{Object.entries(CONCEPT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label" htmlFor="name">Nombre</label><input id="name" name="name" required className="input" placeholder="Administración edificio" /></div>
            <div><label className="label" htmlFor="amount">Monto</label><input id="amount" name="amount" type="number" min="1" step="any" required className="input" /></div>
            <div><label className="label" htmlFor="frequency">Frecuencia</label><select id="frequency" name="frequency" className="input">{Object.entries(FREQ).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label" htmlFor="dayOfMonth">Día del mes</label><input id="dayOfMonth" name="dayOfMonth" type="number" min="1" max="28" defaultValue={1} className="input" /></div>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
