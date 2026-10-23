import Link from "next/link";
import { BarChart } from "@/components/ui/charts";
import { Chip } from "@/components/ui/chip";
import { Donut } from "@/components/ui/donut";
import { Segmented } from "@/components/ui/filters";
import { KpiCard } from "@/components/ui/kpi-card";
import { pageCtx } from "@/lib/auth/permissions";
import { cop } from "@/lib/format";
import { parsePeriod, parseStatus, periodStats } from "@/modules/airbnb/queries";

export const metadata = { title: "Estadísticas" };
const PERIODS = [{ key: "day", label: "Hoy" }, { key: "week", label: "Semana" }, { key: "month", label: "Mes" }, { key: "year", label: "Año" }] as const;

function Delta({ now, before, invert }: { now: number; before: number; invert?: boolean }) {
  if (!before) return <div><Chip>Sin comparación</Chip></div>;
  const d = (now - before) / Math.abs(before);
  const good = invert ? d <= 0 : d >= 0;
  return <div><Chip tone={good ? "positive" : "negative"}>{d >= 0 ? "▲" : "▼"} {Math.abs(d * 100).toFixed(0)}% vs. periodo anterior</Chip></div>;
}

export default async function Stats({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ p?: string; o?: string; status?: string }> }) {
  const { workspaceId } = await params;
  const sp = await searchParams;
  await pageCtx(workspaceId, "dashboard:full");
  const period = parsePeriod(sp.p);
  const offset = Math.min(0, Math.max(-60, Number(sp.o) || 0)) || 0;
  const status = parseStatus(sp.status ?? "ALL");
  const st = periodStats;
  const data = await st(workspaceId, period, offset, status);
  const base = `/w/${workspaceId}/stats`;
  const q = (o: Record<string, string | number>) => `${base}?${new URLSearchParams({ p: period, o: String(offset), status: sp.status ?? "ALL", ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) })}`;
  const expense = data.pyg.variableCosts.total + data.pyg.fixedOpex.total;

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Estadísticas</h1>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Periodo" current={period} items={PERIODS.map((x) => ({ key: x.key, label: x.label, href: q({ p: x.key, o: 0 }) }))} />
        <div className="flex items-center gap-1 rounded-pill bg-surface p-1 shadow-card">
          <Link href={q({ o: offset - 1 })} aria-label="Periodo anterior" className="grid size-8 place-items-center rounded-full hover:bg-canvas">‹</Link>
          <span className="min-w-40 text-center text-sm font-medium first-letter:uppercase">{data.label}</span>
          {offset < 0 ? <Link href={q({ o: offset + 1 })} aria-label="Periodo siguiente" className="grid size-8 place-items-center rounded-full hover:bg-canvas">›</Link> : <span className="grid size-8 place-items-center text-muted/40">›</span>}
        </div>
        <Segmented label="Estado" current={sp.status ?? "ALL"} items={[{ key: "ALL", label: "Todo", href: q({ status: "ALL" }) }, { key: "PAID", label: "Pagado / cobrado", href: q({ status: "PAID" }) }, { key: "PENDING", label: "Pendiente", href: q({ status: "PENDING" }) }]} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard title="Ingresos" value={cop(data.pyg.grossRevenue)}><Delta now={data.pyg.grossRevenue} before={data.prev.income} /></KpiCard>
        <KpiCard title="Gastos" value={cop(expense)}><Delta now={expense} before={data.prev.expense} invert /></KpiCard>
        <KpiCard title="Resultado" value={cop(data.cashFlow)} tone={data.cashFlow < 0 ? "negative" : "positive"}><Delta now={data.cashFlow} before={data.prev.cash} /></KpiCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card"><h2 className="mb-4 font-medium">Ingresos vs gastos</h2><BarChart data={data.series} current="" labelOf={(k) => k} /></section>
        <section className="card"><h2 className="mb-4 font-medium">Gastos por categoría</h2><Donut items={data.breakdown.items} total={data.breakdown.total} /></section>
      </div>

      <section className="panel space-y-2">
        <h2 className="font-medium">Mayores proveedores</h2>
        {data.topVendors.length === 0 && <p className="text-sm text-white/70">Sin gastos con proveedor en este periodo.</p>}
        {data.topVendors.map((v, i) => <div key={v.vendor} className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-2.5 text-sm"><span>{i + 1}. {v.vendor}</span><strong>{cop(v.amount)}</strong></div>)}
      </section>
    </>
  );
}
