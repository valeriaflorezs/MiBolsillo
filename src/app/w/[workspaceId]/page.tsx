import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, CalendarDays, Moon, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { BarChart } from "@/components/ui/charts";
import { Chip } from "@/components/ui/chip";
import { Donut } from "@/components/ui/donut";
import { Filters } from "@/components/ui/filters";
import { KpiCard } from "@/components/ui/kpi-card";
import { ProgressBar } from "@/components/ui/progress";
import { can, pageCtx } from "@/lib/auth/permissions";
import { cop, fmtDate, monthRange, pct } from "@/lib/format";
import { airbnbMetrics, budgetExecution, categoryBreakdown, parseStatus, periodSummary, sixMonthSeries, upcomingReservations } from "@/modules/airbnb/queries";
import { accountBalances, pendingPayables, searchTransactions } from "@/modules/core/queries";

export const metadata = { title: "Resumen" };

export default async function Dashboard({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ month?: string; status?: string }> }) {
  const { workspaceId } = await params;
  const sp = await searchParams;
  const ctx = await pageCtx(workspaceId);
  const { key, start, end } = monthRange(sp.month);
  const base = `/w/${workspaceId}`;

  // OPERATOR: solo sus propios gastos; nunca KPIs (EBITDA, margen, ingresos, saldos).
  if (!can(ctx.role, "dashboard:full")) {
    const [mine, pending] = await Promise.all([
      searchTransactions({ workspaceId, role: ctx.role, userId: ctx.userId, start, end, pageSize: 8 }),
      pendingPayables(workspaceId, ctx.role, ctx.userId, 5),
    ]);
    return (
      <>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-3xl font-semibold tracking-tight">Hola 👋</h1><p className="text-muted">Registra gastos, insumos y facturas de aseo de {ctx.workspace.name}.</p></div>
          <Link href={`${base}/expenses/new`} className="btn btn-primary">+ Registrar gasto</Link>
        </div>
        <Filters base={base} month={key} showStatus={false} />
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard title="Gastos que registraste este mes" value={cop(mine.expense)} hint={`${mine.total} registro(s)`} icon={<ArrowUpFromLine size={16} />} />
          <KpiCard title="Por pagar" value={String(pending.length)} hint="Gastos pendientes registrados por ti" icon={<CalendarDays size={16} />} />
        </div>
        <RecentList workspaceId={workspaceId} rows={mine.rows} />
      </>
    );
  }

  const status = parseStatus(sp.status);
  const isAirbnb = ctx.workspace.type === "AIRBNB";
  const [sum, series, budget, breakdown, balances, recent, pending, metrics, arrivals] = await Promise.all([
    periodSummary(workspaceId, start, end, status),
    sixMonthSeries(workspaceId, key, status),
    budgetExecution(workspaceId, key, start, end),
    categoryBreakdown(workspaceId, start, end, status),
    accountBalances(workspaceId),
    searchTransactions({ workspaceId, role: ctx.role, userId: ctx.userId, start, end, pageSize: 6 }),
    pendingPayables(workspaceId, ctx.role, ctx.userId, 5),
    isAirbnb ? airbnbMetrics(workspaceId, start, end) : null,
    isAirbnb ? upcomingReservations(workspaceId) : [],
  ]);
  const { pyg } = sum;
  const totalBalance = balances.reduce((a, b) => a + b.balance, 0);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-semibold tracking-tight">{ctx.workspace.name}</h1><p className="mt-1 text-muted">Resumen del mes</p></div>
      </div>
      <Filters base={base} month={key} status={sp.status} />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel flex flex-col justify-between gap-5">
          <div>
            <p className="text-sm text-white/70">Saldo total en cuentas</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight">{cop(totalBalance)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip tone="onDark">{sum.cashFlow >= 0 ? "▲" : "▼"} {cop(Math.abs(sum.cashFlow))} flujo del filtro</Chip>
            </div>
          </div>
          <ul className="space-y-2 text-sm">
            {balances.slice(0, 3).map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2"><span className="flex items-center gap-2"><Wallet size={14} aria-hidden />{a.name}</span><span>{cop(a.balance)}</span></li>
            ))}
          </ul>
          <div className="grid grid-cols-3 gap-2">
            {[
              { t: "EXPENSE", l: "Gasto", Icon: ArrowUpFromLine }, { t: "INCOME", l: "Ingreso", Icon: ArrowDownToLine }, { t: "TRANSFER", l: "Transferir", Icon: ArrowLeftRight },
            ].map(({ t, l, Icon }) => (
              <Link key={t} href={`${base}/expenses/new?type=${t}`} className="flex flex-col items-center gap-1 rounded-2xl bg-white/10 px-2 py-3 text-xs backdrop-blur hover:bg-white/20"><Icon size={18} aria-hidden />{l}</Link>
            ))}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <KpiCard title="Flujo de caja" value={cop(sum.cashFlow)} tone={sum.cashFlow < 0 ? "negative" : "positive"} hint="Ingresos − gastos del filtro" trend={series.map((s) => s.cash)} icon={<TrendingUp size={16} />} />
          <KpiCard title="Margen de contribución" value={cop(pyg.contributionMargin)} hint={`${pct(pyg.contributionMarginPct)} de los ingresos`} trend={series.map((s) => s.margin)} icon={<TrendingUp size={16} />} />
          <KpiCard title="EBITDA operativo" value={cop(pyg.ebitda)} tone={pyg.ebitda < 0 ? "negative" : undefined} hint={`${pct(pyg.ebitdaPct)} · CAPEX excluido`} trend={series.map((s) => s.ebitda)} icon={<TrendingUp size={16} />} />
          <KpiCard title="Ejecución del presupuesto" value={budget.totalBudget ? pct(budget.pct) : "—"} hint={budget.totalBudget ? `${cop(budget.totalActual)} de ${cop(budget.totalBudget)}` : "Define un presupuesto en la pestaña Presupuesto"} icon={<CalendarDays size={16} />}>
            {budget.totalBudget > 0 && <ProgressBar value={budget.pct} label="Ejecución del presupuesto" danger={budget.pct > 1} />}
          </KpiCard>
        </div>
      </div>

      {metrics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Ocupación" value={pct(metrics.occupancy)} hint={`${metrics.nights} de ${metrics.available} noches`} icon={<Moon size={16} />}><ProgressBar value={metrics.occupancy} label="Ocupación" /></KpiCard>
          <KpiCard title="Tarifa media (ADR)" value={cop(metrics.adr)} hint="Ingreso por noche vendida" />
          <KpiCard title="RevPAR" value={cop(metrics.revpar)} hint="Ingreso por noche disponible" />
          <section className="card space-y-2">
            <h2 className="text-sm text-muted">Próximas llegadas</h2>
            {arrivals.length === 0 && <p className="text-sm text-muted">Sin reservas futuras.</p>}
            {arrivals.map((r) => <Link key={r.id} href={`${base}/reservations?sel=${r.id}`} className="flex items-center justify-between rounded-xl px-2 py-1.5 text-sm hover:bg-canvas/70"><span className="truncate">{r.guest ?? "Huésped"} <span className="text-muted">· {fmtDate(r.checkIn)}</span></span><span className="shrink-0">{cop(r.amount)}</span></Link>)}
          </section>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card"><h2 className="mb-4 font-medium">Ingresos vs gastos · 6 meses</h2><BarChart data={series} current={key} /></section>
        <section className="card"><h2 className="mb-4 font-medium">Gastos por categoría</h2><Donut items={breakdown.items} total={breakdown.total} /></section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <RecentList workspaceId={workspaceId} rows={recent.rows} />
        <section className="card space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-medium">Por pagar y por cobrar</h2><Link className="text-sm text-brand-text underline" href={`${base}/pending`}>Ver todo</Link></div>
          {pending.length === 0 && <p className="text-sm text-muted">Nada pendiente 🎉</p>}
          {pending.map((t) => (
            <Link key={t.id} href={`${base}/transactions?sel=${t.id}&month=${t.date.toISOString().slice(0, 7)}`} className="flex items-center justify-between rounded-xl px-2 py-1.5 text-sm hover:bg-canvas/70">
              <span className="truncate">{t.vendor ?? t.category?.name ?? "Movimiento"} <span className="text-muted">· {fmtDate(t.date)}</span></span><span className="shrink-0 font-medium">{cop(t.amount)}</span>
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}

function RecentList({ workspaceId, rows }: { workspaceId: string; rows: Awaited<ReturnType<typeof searchTransactions>>["rows"] }) {
  return (
    <section className="panel space-y-3">
      <div className="flex items-center justify-between"><h2 className="font-medium">Actividad reciente</h2><Link className="text-sm text-white/70 underline" href={`/w/${workspaceId}/transactions`}>Ver todo</Link></div>
      {rows.length === 0 && <p className="text-sm text-white/70">Aún no hay movimientos este mes.</p>}
      <ul className="space-y-2">
        {rows.map((t) => (
          <li key={t.id}>
            <Link href={`/w/${workspaceId}/transactions?sel=${t.id}&month=${t.date.toISOString().slice(0, 7)}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-3 py-2.5 text-sm hover:bg-white/20">
              <span className="flex min-w-0 items-center gap-3"><span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15">{t.category?.emoji ?? "💳"}</span><span className="min-w-0"><span className="block truncate font-medium">{t.vendor ?? t.category?.name ?? "Movimiento"}</span><span className="block text-xs text-white/60">{fmtDate(t.date)} · {t.account}</span></span></span>
              <span className={`shrink-0 font-medium ${t.type === "INCOME" ? "text-accent" : ""}`}>{t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "−" : "↔"} {cop(t.amount)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
