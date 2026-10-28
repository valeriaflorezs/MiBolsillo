import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { FormDialog } from "@/components/forms/form-dialog";
import { IconAction } from "@/components/forms/icon-action";
import { ProgressRing } from "@/components/ui/charts";
import { KpiCard } from "@/components/ui/kpi-card";
import { prisma } from "@/lib/db";
import { can, pageCtx } from "@/lib/auth/permissions";
import { capexVariance } from "@/lib/finance/pyg";
import { cop, num } from "@/lib/format";
import { addCapexAction, updateCapexAction } from "@/modules/airbnb/actions";
import { CsvImport } from "@/components/forms/csv-import";
import { importCapexAction } from "@/modules/airbnb/import-actions";
import { ExpensePicker } from "@/components/forms/expense-picker";
import { EXPLAIN } from "@/lib/explain";
import { InfoTip } from "@/components/ui/info-tip";
import { Segmented } from "@/components/ui/filters";

export const metadata = { title: "CAPEX" };
const CAT = { FURNITURE: "Muebles", APPLIANCES: "Electrodomésticos", RENOVATION: "Reformas", DECOR: "Decoración", LINENS_KITCHENWARE: "Ropa de cama y cocina", TECH: "Tecnología", OTHER: "Otros" } as const;

type SP = { vista?: string; q?: string; cat?: string; prop?: string };

export default async function Capex({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<SP> }) {
  const { workspaceId } = await params;
  const sp = await searchParams;
  const ctx = await pageCtx(workspaceId, "data:read");
  const canBuy = can(ctx.role, "capex:update");
  const admin = can(ctx.role, "airbnb:manage");
  const done = sp.vista === "comprados";
  const [items, properties, expenses] = await Promise.all([
    prisma.capexItem.findMany({ where: { workspaceId }, include: { property: { select: { name: true } }, transactions: { where: { type: "EXPENSE" }, select: { id: true, description: true, vendor: true, amount: true }, orderBy: { date: "asc" } } }, orderBy: [{ sortOrder: "asc" }, { capexCategory: "asc" }, { itemDescription: "asc" }] }),
    prisma.property.findMany({ where: { workspaceId }, select: { id: true, name: true } }),
    canBuy ? prisma.transaction.findMany({ where: { workspaceId, type: "EXPENSE", capexItemId: null }, select: { id: true, description: true, vendor: true, amount: true, date: true }, orderBy: { date: "desc" }, take: 300 }) : Promise.resolve([]),
  ]);
  const expenseOptions = expenses.map((e) => ({ id: e.id, label: e.description || e.vendor || "Gasto sin descripción", detail: `${e.date.toISOString().slice(0, 10)}${e.vendor && e.description ? ` · ${e.vendor}` : ""} · ${cop(num(e.amount))}` }));
  // Con gastos vinculados, lo real es la suma de esos gastos (así un precio guardado antes de cambiar la cantidad no distorsiona).
  const rows = items.map((i) => {
    const v = capexVariance({ quantity: i.quantity, budgetedUnitPrice: num(i.budgetedUnitPrice), actualUnitPrice: i.actualUnitPrice == null ? null : num(i.actualUnitPrice) });
    if (i.status !== "PURCHASED" || !i.transactions.length) return { ...i, v };
    const actual = i.transactions.reduce((a, t) => a + num(t.amount), 0);
    return { ...i, v: { budgeted: v.budgeted, actual, variance: v.budgeted - actual } };
  });
  const bought = rows.filter((r) => r.status === "PURCHASED");
  const pending = rows.filter((r) => r.status !== "PURCHASED");
  const totalBudget = rows.reduce((a, r) => a + r.v.budgeted, 0);
  const spent = bought.reduce((a, r) => a + (r.v.actual ?? 0), 0);
  const varianceBought = bought.reduce((a, r) => a + (r.v.variance ?? 0), 0);

  const q = sp.q?.trim().toLowerCase();
  const filter = (r: (typeof rows)[number]) =>
    (!q || `${r.itemDescription} ${r.store ?? ""}`.toLowerCase().includes(q)) && (!sp.cat || r.capexCategory === sp.cat) && (!sp.prop || r.propertyId === sp.prop);
  const list = (done ? [...bought].sort((a, b) => a.itemDescription.localeCompare(b.itemDescription, "es", { numeric: true, sensitivity: "base" })) : pending).filter(filter);
  const sumBudget = list.reduce((a, r) => a + r.v.budgeted, 0);
  const sumActual = list.reduce((a, r) => a + (r.v.actual ?? 0), 0);
  const href = (vista: string) => `/w/${workspaceId}/capex${vista ? `?vista=${vista}` : ""}`;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">CAPEX · Adecuación</h1>
        {admin && (
          <div className="flex items-center gap-2">
            <FormDialog label="Importar desde CSV / Excel" icon="upload" tone="default" title="Importar ítems desde CSV / Excel"><CsvImport action={importCapexAction} workspaceId={workspaceId} properties={properties} title="Importar ítems" columns="categoria, descripcion, cantidad, precio_unitario_presupuestado, precio_unitario_real, tienda" /></FormDialog>
            <FormDialog label="Agregar ítem" title="Agregar ítem" wide>
              <ActionForm action={addCapexAction} submitLabel="Agregar">
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className="label" htmlFor="propertyId">Propiedad</label><select id="propertyId" name="propertyId" className="input">{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <div><label className="label" htmlFor="capexCategory">Categoría</label><select id="capexCategory" name="capexCategory" className="input">{Object.entries(CAT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                  <div className="sm:col-span-2"><label className="label" htmlFor="itemDescription">Descripción</label><input id="itemDescription" name="itemDescription" required className="input" placeholder="Nevera 300 L" /></div>
                  <div><label className="label" htmlFor="quantity">Cantidad</label><input id="quantity" name="quantity" type="number" min="1" max="10000" step="1" defaultValue={1} className="input" /></div>
                  <div><label className="label" htmlFor="budgetedUnitPrice">Precio unitario presupuestado</label><input id="budgetedUnitPrice" name="budgetedUnitPrice" type="number" max="1000000000000" min="0" step="0.01" required className="input" /></div>
                  <div className="sm:col-span-2"><label className="label" htmlFor="store">Tienda</label><input id="store" name="store" className="input" /></div>
                </div>
              </ActionForm>
            </FormDialog>
          </div>
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <section className="card flex items-center gap-4"><ProgressRing value={rows.length ? bought.length / rows.length : 0} label="Ítems comprados" /><div><h2 className="text-sm text-muted">Comprado</h2><p className="font-medium">{bought.length} de {rows.length}</p></div></section>
        <KpiCard info={EXPLAIN.capexBudget} title="Presupuesto total" value={cop(totalBudget)} />
        <KpiCard info={EXPLAIN.capexSpent} title="Gastado (real)" value={cop(spent)} />
        <KpiCard info={EXPLAIN.capexVariance} title="Variación en lo comprado" value={cop(varianceBought)} tone={varianceBought < 0 ? "negative" : "positive"} hint={varianceBought < 0 ? "Sobre el presupuesto" : "Ahorro vs presupuesto"} />
      </div>

      <Segmented label="Estado de los ítems" current={done ? "comprados" : "pendientes"} items={[
        { key: "pendientes", label: `Por comprar (${pending.length})`, href: href("") },
        { key: "comprados", label: `Comprados (${bought.length})`, href: href("comprados") },
      ]} />

      <form className="card grid grid-cols-2 gap-3 lg:grid-cols-5" role="search" aria-label="Filtrar ítems">
        {done && <input type="hidden" name="vista" value="comprados" />}
        <div className="col-span-2"><label className="label" htmlFor="q">Buscar</label><input id="q" name="q" defaultValue={sp.q} placeholder="Ítem o tienda" className="input" /></div>
        <div><label className="label" htmlFor="cat">Categoría</label><select id="cat" name="cat" defaultValue={sp.cat ?? ""} className="input"><option value="">Todas</option>{Object.entries(CAT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        {properties.length > 1 ? <div><label className="label" htmlFor="prop">Propiedad</label><select id="prop" name="prop" defaultValue={sp.prop ?? ""} className="input"><option value="">Todas</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div> : <div className="hidden lg:block" />}
        <div className="col-span-2 flex items-end gap-2 lg:col-span-1"><button className="btn btn-dark flex-1">Filtrar</button>{(sp.q || sp.cat || sp.prop) && <Link href={href(done ? "comprados" : "")} className="btn btn-ghost">Limpiar</Link>}</div>
      </form>

      <section className="card overflow-x-auto !p-2">
        {list.length === 0 ? <p className="p-6 text-center text-muted">{rows.length === 0 ? `Aún no hay ítems. ${admin ? "Agrega el primero abajo." : ""}` : sp.q || sp.cat || sp.prop ? "Ningún ítem coincide con el filtro." : done ? "Todavía no hay ítems comprados." : "¡No quedan ítems por comprar!"}</p> : (
          <table className="w-full">
            <thead><tr>
              <th className="th">Ítem</th><th className="th">Categoría</th><th className="th text-right">Cant.</th>
              {done ? <><th className="th text-right">Presupuestado</th><th className="th text-right">Real</th><th className="th text-right">Variación <InfoTip {...EXPLAIN.capexVariance} /></th><th className="th">Gastos</th></>
                : <><th className="th text-right">P. unit. presup.</th><th className="th text-right">Presupuestado</th>{canBuy && <th className="th">Asignar a gastos</th>}</>}
            </tr></thead>
            <tbody className="divide-y divide-line">
              {list.map((r) => (
                <tr key={r.id}>
                  <td className="td"><p className="font-medium">{r.itemDescription}{admin && <> <Link href={`/w/${workspaceId}/capex/${r.id}/edit`} className="text-xs font-normal text-brand-text underline">Editar</Link></>}</p><p className="text-xs text-muted">{r.property.name}{r.store ? ` · ${r.store}` : ""}</p></td>
                  <td className="td text-sm">{CAT[r.capexCategory]}</td>
                  <td className="td text-right">{r.quantity}</td>
                  {done ? (
                    <>
                      <td className="td text-right">{cop(r.v.budgeted)}</td>
                      <td className="td text-right">{r.v.actual == null ? "—" : cop(r.v.actual)}</td>
                      <td className={`td text-right font-medium ${r.v.variance == null ? "" : r.v.variance < 0 ? "text-negative" : "text-positive"}`}>{r.v.variance == null ? "—" : cop(r.v.variance)}</td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{r.transactions.length} {r.transactions.length === 1 ? "gasto" : "gastos"}</span>
                          <FormDialog label={canBuy ? "Gestionar gastos" : "Ver gastos"} icon={canBuy ? "edit" : "receipt"} tone="default" title={`Gastos de ${r.itemDescription}`}>
                            <div className="space-y-3">
                            <ul className="space-y-1 text-sm">
                              {r.transactions.map((t) => (
                                <li key={t.id} className="flex items-center gap-3">
                                  <span className="min-w-0 flex-1 truncate" title={t.description || t.vendor || "Gasto"}>{t.description || t.vendor || "Gasto"}</span>
                                  <span className="shrink-0 tabular-nums">{cop(num(t.amount))}</span>
                                  {canBuy && <IconAction action={updateCapexAction} icon="delete" label="Quitar gasto" tone="danger" confirm="¿Quitar este gasto del ítem? El movimiento no se borra." fields={{ workspaceId, itemId: r.id, intent: "unlink", transactionId: t.id }} />}
                                </li>
                              ))}
                            </ul>
                            {canBuy && (
                              <div className="flex items-center gap-2">
                                <ActionForm action={updateCapexAction} submitLabel="Agregar gastos" submitIcon="add" className="flex items-center gap-2" resetOnSuccess={false}>
                                  <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="itemId" value={r.id} /><input type="hidden" name="intent" value="link" />
                                  <ExpensePicker name="transactionId" options={expenseOptions} placeholder="Agregar más gastos…" />
                                </ActionForm>
                                <IconAction action={updateCapexAction} icon="undo" label="Deshacer compra" tone="danger" confirm="¿Desvincular todos los gastos y devolver el ítem a «Por comprar»? Los movimientos no se borran." fields={{ workspaceId, itemId: r.id, intent: "undo" }} />
                              </div>
                            )}
                            </div>
                          </FormDialog>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="td text-right">{cop(num(r.budgetedUnitPrice))}</td>
                      <td className="td text-right">{cop(r.v.budgeted)}</td>
                      {canBuy && <td className="td">
                        <ActionForm action={updateCapexAction} submitLabel="Asignar a los gastos elegidos" submitIcon="check" className="flex items-center gap-2" resetOnSuccess={false}>
                          <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="itemId" value={r.id} /><input type="hidden" name="intent" value="link" />
                          <ExpensePicker name="transactionId" options={expenseOptions} />
                        </ActionForm>
                      </td>}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t border-line font-medium">
              <td className="td" colSpan={3}>{list.length} {list.length === 1 ? "ítem" : "ítems"}</td>
              {done ? <><td className="td text-right">{cop(sumBudget)}</td><td className="td text-right">{cop(sumActual)}</td><td className={`td text-right ${sumBudget - sumActual < 0 ? "text-negative" : "text-positive"}`}>{cop(sumBudget - sumActual)}</td><td className="td" /></>
                : <><td className="td" /><td className="td text-right">{cop(sumBudget)}</td>{canBuy && <td className="td" />}</>}
            </tr></tfoot>
          </table>
        )}
      </section>
    </>
  );
}
