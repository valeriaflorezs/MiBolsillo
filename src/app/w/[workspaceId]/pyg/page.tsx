import { Filters } from "@/components/ui/filters";
import { prisma } from "@/lib/db";
import { pageCtx } from "@/lib/auth/permissions";
import { cop, monthRange, pct } from "@/lib/format";
import { periodSummary } from "@/modules/airbnb/queries";
import { InfoTip, type Explain } from "@/components/ui/info-tip";
import { EXPLAIN } from "@/lib/explain";

export const metadata = { title: "Estado de resultados" };

function Row({ label, value, strong, indent, rev, info }: { label: string; value: number; strong?: boolean; indent?: boolean; rev: number; info?: Explain }) {
  return (
    <tr className={strong ? "bg-canvas font-semibold" : ""}>
      <td className={`td ${indent ? "pl-8 text-muted" : ""}`}>{label}{info && <InfoTip {...info} className="ml-2" />}</td>
      <td className="td text-right">{indent && value ? "−" : ""} {cop(Math.abs(value))}</td>
      <td className="td text-right text-muted">{rev ? pct(value / rev) : "—"}</td>
    </tr>
  );
}

export default async function Pyg({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ month?: string; prop?: string }> }) {
  const { workspaceId } = await params;
  await pageCtx(workspaceId, "pyg:read");
  const sp = await searchParams;
  const { key, start, end } = monthRange(sp.month);
  const props = await prisma.property.findMany({ where: { workspaceId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const prop = props.find((x) => x.id === sp.prop);
  const { pyg: p } = await periodSummary(workspaceId, start, end, undefined, undefined, prop?.id); // devengo: incluye pagado y por pagar
  const rev = p.grossRevenue;
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Estado de resultados</h1>
      <div className="flex flex-wrap items-center gap-4">
        <Filters base={`/w/${workspaceId}/pyg`} month={key} showStatus={false} />
        {props.length > 1 && (
          <form className="flex items-center gap-2" aria-label="Filtrar por propiedad">
            <input type="hidden" name="month" value={key} />
            <label className="sr-only" htmlFor="prop">Propiedad</label>
            <select id="prop" name="prop" defaultValue={prop?.id ?? ""} className="input !w-auto"><option value="">Todas las propiedades</option>{props.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
            <button className="btn btn-ghost">Ver</button>
          </form>
        )}
      </div>
      <section className="card !p-2">
        <table className="w-full">
          <caption className="sr-only">Estado de resultados del mes (base devengo)</caption>
          <thead><tr><th className="th">Concepto</th><th className="th text-right">Valor</th><th className="th text-right">% ingresos</th></tr></thead>
          <tbody className="divide-y divide-line">
            <Row label="Ingresos brutos" value={rev} strong rev={rev} info={EXPLAIN.pygRevenue} />
            <Row label="Comisiones de plataforma" value={p.variableCosts.commissions} indent rev={rev} info={EXPLAIN.pygVariable} />
            <Row label="Aseo y lavandería" value={p.variableCosts.cleaning} indent rev={rev} />
            <Row label="Amenities e insumos" value={p.variableCosts.amenities} indent rev={rev} />
            <Row label="Otros costos variables" value={p.variableCosts.other} indent rev={rev} />
            <Row label="Margen de contribución" value={p.contributionMargin} strong rev={rev} info={EXPLAIN.pygMargin} />
            <Row label="Administración (HOA)" value={p.fixedOpex.admin} indent rev={rev} />
            <Row label="Servicios públicos" value={p.fixedOpex.utilities} indent rev={rev} />
            <Row label="Internet y apps" value={p.fixedOpex.subscriptions} indent rev={rev} />
            <Row label="Mantenimiento" value={p.fixedOpex.maintenance} indent rev={rev} />
            <Row label="Otros fijos" value={p.fixedOpex.other} indent rev={rev} />
            <Row label="EBITDA operativo" value={p.ebitda} strong rev={rev} info={EXPLAIN.pygEbitda} />
          </tbody>
        </table>
      </section>
      <p className="text-sm text-muted">Base devengo: incluye ingresos y gastos pagados y por pagar. CAPEX ({cop(p.capex)} este mes) no afecta el EBITDA.</p>
    </>
  );
}
