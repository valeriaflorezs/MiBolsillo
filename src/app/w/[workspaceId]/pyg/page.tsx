import { Filters } from "@/components/ui/filters";
import { pageCtx } from "@/lib/auth/permissions";
import { cop, monthRange, pct } from "@/lib/format";
import { periodSummary } from "@/modules/airbnb/queries";

export const metadata = { title: "Estado de resultados" };

function Row({ label, value, strong, indent, rev }: { label: string; value: number; strong?: boolean; indent?: boolean; rev: number }) {
  return (
    <tr className={strong ? "bg-canvas font-semibold" : ""}>
      <td className={`td ${indent ? "pl-8 text-muted" : ""}`}>{label}</td>
      <td className="td text-right">{indent && value ? "−" : ""} {cop(Math.abs(value))}</td>
      <td className="td text-right text-muted">{rev ? pct(value / rev) : "—"}</td>
    </tr>
  );
}

export default async function Pyg({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ month?: string }> }) {
  const { workspaceId } = await params;
  await pageCtx(workspaceId, "pyg:read");
  const { key, start, end } = monthRange((await searchParams).month);
  const { pyg: p } = await periodSummary(workspaceId, start, end, undefined); // devengo: incluye pagado y por pagar
  const rev = p.grossRevenue;
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Estado de resultados</h1>
      <Filters base={`/w/${workspaceId}/pyg`} month={key} showStatus={false} />
      <section className="card !p-2">
        <table className="w-full">
          <caption className="sr-only">Estado de resultados del mes (base devengo)</caption>
          <thead><tr><th className="th">Concepto</th><th className="th text-right">Valor</th><th className="th text-right">% ingresos</th></tr></thead>
          <tbody className="divide-y divide-line">
            <Row label="Ingresos brutos" value={rev} strong rev={rev} />
            <Row label="Comisiones de plataforma" value={p.variableCosts.commissions} indent rev={rev} />
            <Row label="Aseo y lavandería" value={p.variableCosts.cleaning} indent rev={rev} />
            <Row label="Amenities e insumos" value={p.variableCosts.amenities} indent rev={rev} />
            <Row label="Otros costos variables" value={p.variableCosts.other} indent rev={rev} />
            <Row label="Margen de contribución" value={p.contributionMargin} strong rev={rev} />
            <Row label="Administración (HOA)" value={p.fixedOpex.admin} indent rev={rev} />
            <Row label="Servicios públicos" value={p.fixedOpex.utilities} indent rev={rev} />
            <Row label="Internet y apps" value={p.fixedOpex.subscriptions} indent rev={rev} />
            <Row label="Mantenimiento" value={p.fixedOpex.maintenance} indent rev={rev} />
            <Row label="Otros fijos" value={p.fixedOpex.other} indent rev={rev} />
            <Row label="EBITDA operativo" value={p.ebitda} strong rev={rev} />
          </tbody>
        </table>
      </section>
      <p className="text-sm text-muted">Base devengo: incluye gastos pagados y por pagar, y reservas por fecha de entrada. CAPEX ({cop(p.capex)} este mes) no afecta el EBITDA.</p>
    </>
  );
}
