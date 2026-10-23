import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { ProgressRing } from "@/components/ui/charts";
import { KpiCard } from "@/components/ui/kpi-card";
import { prisma } from "@/lib/db";
import { can, pageCtx } from "@/lib/auth/permissions";
import { capexVariance } from "@/lib/finance/pyg";
import { cop, num } from "@/lib/format";
import { addCapexAction, updateCapexAction } from "@/modules/airbnb/actions";
import { CsvImport } from "@/components/forms/csv-import";
import { importCapexAction } from "@/modules/airbnb/import-actions";

export const metadata = { title: "CAPEX" };
const CAT = { FURNITURE: "Muebles", APPLIANCES: "Electrodomésticos", RENOVATION: "Reformas", DECOR: "Decoración", LINENS_KITCHENWARE: "Ropa de cama y cocina", TECH: "Tecnología", OTHER: "Otros" } as const;

export default async function Capex({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const ctx = await pageCtx(workspaceId, "data:read");
  const canBuy = can(ctx.role, "capex:update");
  const admin = can(ctx.role, "airbnb:manage");
  const [items, properties] = await Promise.all([
    prisma.capexItem.findMany({ where: { workspaceId }, include: { property: { select: { name: true } } }, orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { capexCategory: "asc" }] }),
    prisma.property.findMany({ where: { workspaceId }, select: { id: true, name: true } }),
  ]);
  const rows = items.map((i) => ({ ...i, v: capexVariance({ quantity: i.quantity, budgetedUnitPrice: num(i.budgetedUnitPrice), actualUnitPrice: i.actualUnitPrice == null ? null : num(i.actualUnitPrice) }) }));
  const bought = rows.filter((r) => r.status === "PURCHASED");
  const totalBudget = rows.reduce((a, r) => a + r.v.budgeted, 0);
  const spent = bought.reduce((a, r) => a + (r.v.actual ?? 0), 0);
  const varianceBought = bought.reduce((a, r) => a + (r.v.variance ?? 0), 0);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">CAPEX · Adecuación</h1>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <section className="card flex items-center gap-4"><ProgressRing value={rows.length ? bought.length / rows.length : 0} label="Ítems comprados" /><div><h2 className="text-sm text-muted">Comprado</h2><p className="font-medium">{bought.length} de {rows.length}</p></div></section>
        <KpiCard title="Presupuesto total" value={cop(totalBudget)} />
        <KpiCard title="Gastado (real)" value={cop(spent)} />
        <KpiCard title="Variación en lo comprado" value={cop(varianceBought)} tone={varianceBought < 0 ? "negative" : "positive"} hint={varianceBought < 0 ? "Sobre el presupuesto" : "Ahorro vs presupuesto"} />
      </div>

      <section className="card overflow-x-auto !p-2">
        {rows.length === 0 ? <p className="p-6 text-center text-muted">Aún no hay ítems. {admin ? "Agrega el primero abajo." : ""}</p> : (
          <table className="w-full">
            <thead><tr><th className="th">Ítem</th><th className="th">Cant.</th><th className="th text-right">P. unit. presup.</th><th className="th text-right">Presupuestado</th><th className="th text-right">Real</th><th className="th text-right">Variación</th><th className="th">Compra</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className={r.status === "PURCHASED" ? "bg-canvas/50" : ""}>
                  <td className="td"><p className="font-medium">{r.itemDescription}{admin && <> <Link href={`/w/${workspaceId}/capex/${r.id}/edit`} className="text-xs font-normal text-brand-text underline">Editar</Link></>}</p><p className="text-xs text-muted">{CAT[r.capexCategory]} · {r.property.name}{r.store ? ` · ${r.store}` : ""}</p></td>
                  <td className="td">{r.quantity}</td>
                  <td className="td text-right">{cop(num(r.budgetedUnitPrice))}</td>
                  <td className="td text-right">{cop(r.v.budgeted)}</td>
                  <td className="td text-right">{r.v.actual == null ? "—" : cop(r.v.actual)}</td>
                  <td className={`td text-right font-medium ${r.v.variance == null ? "" : r.v.variance < 0 ? "text-negative" : "text-positive"}`}>{r.v.variance == null ? "—" : cop(r.v.variance)}</td>
                  <td className="td">
                    {!canBuy ? <span className="text-sm text-muted">{r.status === "PURCHASED" ? "Comprado ✓" : "Pendiente"}</span> : <ActionForm action={updateCapexAction} submitLabel={r.status === "PURCHASED" ? "Deshacer" : "Comprado ✓"} variant={r.status === "PURCHASED" ? "ghost" : "primary"} className="flex items-center gap-2" resetOnSuccess={false}>
                      <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="itemId" value={r.id} />
                      <input type="hidden" name="intent" value={r.status === "PURCHASED" ? "undo" : "buy"} />
                      {r.status === "PENDING" && <><label className="sr-only" htmlFor={`p${r.id}`}>Precio unitario real</label><input id={`p${r.id}`} name="actualUnitPrice" type="number" min="0" step="any" placeholder="Precio real" className="input !w-28" /></>}
                    </ActionForm>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {admin && <CsvImport action={importCapexAction} workspaceId={workspaceId} properties={properties} title="Importar ítems desde CSV / Excel" columns="categoria, descripcion, cantidad, precio_unitario_presupuestado, precio_unitario_real, tienda" />}
      {admin && (
        <section className="card space-y-4">
          <h2 className="font-medium">Agregar ítem</h2>
          <ActionForm action={addCapexAction} submitLabel="Agregar">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className="label" htmlFor="propertyId">Propiedad</label><select id="propertyId" name="propertyId" className="input">{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="label" htmlFor="capexCategory">Categoría</label><select id="capexCategory" name="capexCategory" className="input">{Object.entries(CAT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
              <div><label className="label" htmlFor="itemDescription">Descripción</label><input id="itemDescription" name="itemDescription" required className="input" placeholder="Nevera 300 L" /></div>
              <div><label className="label" htmlFor="quantity">Cantidad</label><input id="quantity" name="quantity" type="number" min="1" defaultValue={1} className="input" /></div>
              <div><label className="label" htmlFor="budgetedUnitPrice">Precio unitario presupuestado</label><input id="budgetedUnitPrice" name="budgetedUnitPrice" type="number" min="0" step="any" required className="input" /></div>
              <div><label className="label" htmlFor="store">Tienda</label><input id="store" name="store" className="input" /></div>
            </div>
          </ActionForm>
        </section>
      )}
    </>
  );
}
