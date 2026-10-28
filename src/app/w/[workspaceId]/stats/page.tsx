import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { BarChart } from "@/components/ui/charts";
import { Chip } from "@/components/ui/chip";
import { Donut } from "@/components/ui/donut";
import { Segmented } from "@/components/ui/filters";
import { KpiCard } from "@/components/ui/kpi-card";
import { pageCtx } from "@/lib/auth/permissions";
import { CategoryFilter } from "@/components/forms/category-filter";
import { cop } from "@/lib/format";
import { parseExclusion, parsePeriod, parseStatus, periodStats } from "@/modules/airbnb/queries";
import { accountOptions, categoryOptions } from "@/modules/core/queries";
import { EXPLAIN } from "@/lib/explain";
import { InfoTip } from "@/components/ui/info-tip";

export const metadata = { title: "Estadísticas" };
const PERIODS = [{ key: "day", label: "Hoy" }, { key: "week", label: "Semana" }, { key: "month", label: "Mes" }, { key: "year", label: "Año" }] as const;

function Delta({ now, before, invert }: { now: number; before: number; invert?: boolean }) {
  if (!before) return <div><Chip>Sin comparación</Chip></div>;
  const d = (now - before) / Math.abs(before);
  const good = invert ? d <= 0 : d >= 0;
  return <div><Chip tone={good ? "positive" : "negative"}><Icon name={d >= 0 ? "trending_up" : "trending_down"} size={14} className="mr-1 inline" /> {Math.abs(d * 100).toFixed(0)}% vs. periodo anterior</Chip></div>;
}

export default async function Stats({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ p?: string; o?: string; status?: string; x?: string }> }) {
  const { workspaceId } = await params;
  const sp = await searchParams;
  await pageCtx(workspaceId, "finance:read");
  const period = parsePeriod(sp.p);
  const offset = Math.min(0, Math.max(-60, Number(sp.o) || 0)) || 0;
  const status = parseStatus(sp.status ?? "ALL");
  const [cats, accs] = await Promise.all([categoryOptions(workspaceId), accountOptions(workspaceId)]);
  const known = new Set([...cats.map((c) => c.id), ...accs.map((a) => `a:${a.id}`), "none"]);
  const excluded = parseExclusion(sp.x).filter((x) => known.has(x));
  const data = await periodStats(workspaceId, period, offset, status, excluded);
  const base = `/w/${workspaceId}/stats`;
  const q = (o: Record<string, string | number>) => `${base}?${new URLSearchParams({ p: period, o: String(offset), status: sp.status ?? "ALL", ...(excluded.length ? { x: excluded.join(",") } : {}), ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) })}`;
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

      <CategoryFilter
        workspaceId={workspaceId} excluded={excluded} hasParam={sp.x !== undefined}
        base={{ p: period, o: String(offset), status: sp.status ?? "ALL" }}
        groups={[
          { title: "Gastos", items: [...cats.filter((c) => c.expenseKind).map((c) => ({ id: c.id, label: c.name })), { id: "none", label: "Sin categoría" }] },
          { title: "Cuentas", items: accs.map((a) => ({ id: `a:${a.id}`, label: a.name })) },
        ]}
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <KpiCard info={EXPLAIN.statsIncome} title="Ingresos" value={cop(data.pyg.grossRevenue)}><Delta now={data.pyg.grossRevenue} before={data.prev.income} /></KpiCard>
        <KpiCard info={EXPLAIN.statsExpense} title="Gastos" value={cop(expense)}><Delta now={expense} before={data.prev.expense} invert /></KpiCard>
        <KpiCard info={EXPLAIN.statsResult} title="Resultado" value={cop(data.pyg.grossRevenue - expense)} tone={data.pyg.grossRevenue - expense < 0 ? "negative" : "positive"}><Delta now={data.pyg.grossRevenue - expense} before={data.prev.income - data.prev.expense} /></KpiCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card"><h2 className="mb-4 flex items-center gap-2 font-medium">Ingresos vs gastos <InfoTip {...EXPLAIN.sixMonths} title="Ingresos vs gastos" lines={["Ingresos y gastos de cada día (o mes, si miras un año) del periodo, con el filtro actual."]} /></h2><BarChart data={data.series} current="" labelOf={(k) => k} /></section>
        <section className="card"><h2 className="mb-4 flex items-center gap-2 font-medium">Gastos por categoría <InfoTip {...EXPLAIN.donut} /></h2><Donut items={data.breakdown.items} total={data.breakdown.total} /></section>
      </div>

      <section className="panel space-y-2">
        <h2 className="flex items-center gap-2 font-medium">Mayores proveedores <InfoTip {...EXPLAIN.vendors} /></h2>
        {data.topVendors.length === 0 && <p className="text-sm text-white/70">Sin gastos con proveedor en este periodo.</p>}
        {data.topVendors.map((v, i) => <div key={v.vendor} className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-2.5 text-sm"><span>{i + 1}. {v.vendor}</span><strong>{cop(v.amount)}</strong></div>)}
      </section>
    </>
  );
}
