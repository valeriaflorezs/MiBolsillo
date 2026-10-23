import Link from "next/link";
import { BarChart } from "@/components/ui/charts";
import { Filters } from "@/components/ui/filters";
import { KpiCard } from "@/components/ui/kpi-card";
import { pageCtx, can } from "@/lib/auth/permissions";
import { cop, monthRange, pct } from "@/lib/format";
import { budgetExecution, parseStatus, periodSummary, sixMonthSeries } from "@/modules/airbnb/queries";
import { listTransactions } from "@/modules/core/queries";

export const metadata = { title: "Resumen" };

export default async function Dashboard({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ month?: string; status?: string }> }) {
  const { workspaceId } = await params;
  const sp = await searchParams;
  const ctx = await pageCtx(workspaceId);
  const { key, start, end } = monthRange(sp.month);

  // OPERATOR: solo sus propios gastos; nunca KPIs (EBITDA, margen, ingresos).
  if (!can(ctx.role, "dashboard:full")) {
    const mine = await listTransactions({ workspaceId, role: ctx.role, userId: ctx.userId, start, end });
    const total = mine.reduce((a, t) => a + t.amount, 0);
    return (
      <>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-3xl font-semibold tracking-tight">Hola 👋</h1><p className="text-muted">Registra aquí gastos, insumos y facturas de aseo.</p></div>
          <Link href={`/w/${workspaceId}/expenses/new`} className="btn btn-primary">+ Registrar gasto</Link>
        </div>
        <Filters base={`/w/${workspaceId}`} month={key} showStatus={false} />
        <KpiCard title="Gastos que registraste este mes" value={cop(total)} hint={`${mine.length} registro(s)`} />
      </>
    );
  }

  const status = parseStatus(sp.status);
  const [sum, series, budget] = await Promise.all([
    periodSummary(workspaceId, start, end, status),
    sixMonthSeries(workspaceId, key, status),
    budgetExecution(workspaceId, key, start, end),
  ]);
  const { pyg } = sum;
  const isAirbnb = ctx.workspace.type === "AIRBNB";

  return (
    <>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{ctx.workspace.name}</h1>
        <p className="mt-1 text-muted">Resumen del mes</p>
      </div>
      <Filters base={`/w/${workspaceId}`} month={key} status={sp.status} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Flujo de caja" value={cop(sum.cashFlow)} tone={sum.cashFlow < 0 ? "negative" : "positive"} hint="Ingresos − gastos del filtro" />
        <KpiCard title="Margen de contribución" value={cop(pyg.contributionMargin)} hint={`${pct(pyg.contributionMarginPct)} de los ingresos`} />
        <KpiCard title="EBITDA operativo" value={cop(pyg.ebitda)} tone={pyg.ebitda < 0 ? "negative" : undefined} hint={`${pct(pyg.ebitdaPct)} · CAPEX excluido`} />
        <KpiCard title="Ejecución del presupuesto" value={budget.totalBudget ? pct(budget.pct) : "—"} hint={budget.totalBudget ? `${cop(budget.totalActual)} de ${cop(budget.totalBudget)}` : "Define un presupuesto en la pestaña Presupuesto"} />
      </div>
      <section className="card">
        <h2 className="mb-4 font-medium">Ingresos vs gastos · últimos 6 meses</h2>
        <BarChart data={series} current={key} />
      </section>
      {isAirbnb && <p className="text-sm text-muted">Detalle en la pestaña <Link className="underline" href={`/w/${workspaceId}/pyg?month=${key}`}>PyG</Link>.</p>}
    </>
  );
}
