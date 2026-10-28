import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, CalendarDays, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { StackedBars } from "@/components/ui/charts";
import { CategoryFilter } from "@/components/forms/category-filter";
import { Filters } from "@/components/ui/filters";
import { FolderCard } from "@/components/ui/folder-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { ProgressBar } from "@/components/ui/progress";
import { RingGauge } from "@/components/ui/ring-gauge";
import { can, pageCtx } from "@/lib/auth/permissions";
import { cop, fmtDate, monthRange, pct, txTitle, txVendorHint } from "@/lib/format";
import { budgetExecution, categoryBreakdown, parseExclusion, parseStatus, periodSummary, sixMonthSeries } from "@/modules/airbnb/queries";
import { accountBalances, categoryOptions, pendingPayables, searchTransactions } from "@/modules/core/queries";
import { EXPLAIN } from "@/lib/explain";
import { InfoTip } from "@/components/ui/info-tip";

export const metadata = { title: "Resumen" };

export default async function Dashboard({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ month?: string; status?: string; x?: string }> }) {
  const { workspaceId } = await params;
  const sp = await searchParams;
  const ctx = await pageCtx(workspaceId);
  const { key, start, end } = monthRange(sp.month);
  const base = `/w/${workspaceId}`;

  // OPERATOR: solo sus propios gastos; nunca KPIs (EBITDA, margen, ingresos, saldos).
  if (!can(ctx.role, "finance:read")) {
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
        <div className="grid gap-5 sm:grid-cols-2">
          <KpiCard title="Gastos que registraste este mes" value={cop(mine.expense)} hint={`${mine.total} registro(s)`} icon={<ArrowUpFromLine size={16} />} />
          <KpiCard title="Por pagar" value={String(pending.length)} hint="Gastos pendientes registrados por ti" icon={<CalendarDays size={16} />} />
        </div>
        <RecentList workspaceId={workspaceId} rows={mine.rows} />
      </>
    );
  }

  const status = parseStatus(sp.status);
  const cats = await categoryOptions(workspaceId);
  const known = new Set([...cats.map((c) => c.id), "none"]);
  const excluded = parseExclusion(sp.x).filter((x) => known.has(x) || x.startsWith("a:"));
  const [sum, series, budget, breakdown, balances, recent, pending] = await Promise.all([
    periodSummary(workspaceId, start, end, status, excluded),
    sixMonthSeries(workspaceId, key, status, excluded),
    budgetExecution(workspaceId, key, start, end, excluded),
    categoryBreakdown(workspaceId, start, end, status, excluded),
    accountBalances(workspaceId),
    searchTransactions({ workspaceId, role: ctx.role, userId: ctx.userId, start, end, pageSize: 6, exclude: excluded }),
    pendingPayables(workspaceId, ctx.role, ctx.userId, 5, excluded),
  ]);
  const canWrite = can(ctx.role, "transaction:create");
  const { pyg } = sum;
  const expense = pyg.variableCosts.total + pyg.fixedOpex.total;
  // El saldo es el dinero en cuentas (efectivo, bancos, billeteras): la deuda de las tarjetas se muestra aparte, no se resta.
  const totalBalance = balances.filter((b) => b.type !== "CREDIT_CARD").reduce((a, b) => a + b.balance, 0);
  const cardDebt = balances.filter((b) => b.type === "CREDIT_CARD").reduce((a, b) => a + Math.max(0, -b.balance), 0);
  const prevCash = series.length > 1 ? series[series.length - 2].cash : 0;
  const delta = prevCash ? (sum.cashFlow - prevCash) / Math.abs(prevCash) : null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-semibold tracking-tight">{ctx.workspace.name}</h1><p className="mt-1 text-muted">Resumen del mes</p></div>
      </div>
      <Filters base={base} month={key} status={sp.status} x={excluded.length ? excluded.join(",") : undefined} />
      <CategoryFilter
        workspaceId={workspaceId} excluded={excluded} hasParam={sp.x !== undefined}
        base={{ month: key, ...(sp.status ? { status: sp.status } : {}) }}
        groups={[
          { title: "Gastos", items: [...cats.filter((c) => c.expenseKind).map((c) => ({ id: c.id, label: `${c.emoji ?? ""} ${c.name}`.trim() })), { id: "none", label: "Sin categoría" }] },
          { title: "Ingresos", items: cats.filter((c) => !c.expenseKind).map((c) => ({ id: c.id, label: `${c.emoji ?? ""} ${c.name}`.trim() })) },
        ]}
      />

      <section className="hero" aria-label="Saldo total">
        <p className="flex items-center gap-1.5 text-sm text-white/80">Saldo total en cuentas <InfoTip {...EXPLAIN.balance} /></p>
        <p className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">{cop(totalBalance)}<span className="text-white/45">,00</span></p>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="chip-outline"><TrendingUp size={12} className="mr-1" aria-hidden />{delta === null ? "Sin comparación" : `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}% vs. mes anterior`}<InfoTip {...EXPLAIN.vsPrevious} className="ml-1.5" /></span>
          <span className="chip-outline">{sum.cashFlow >= 0 ? "+" : "−"}{cop(Math.abs(sum.cashFlow))} · flujo del filtro <InfoTip {...EXPLAIN.cashFlow} className="ml-1.5" /></span>
          {cardDebt > 0 && <Link href={`${base}/accounts?t=tarjetas`} className="chip-outline">Tarjetas: debes {cop(cardDebt)}</Link>}
        </div>
        {canWrite && <div className="mt-7 grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { t: "EXPENSE", l: "Gasto", Icon: ArrowUpFromLine }, { t: "INCOME", l: "Ingreso", Icon: ArrowDownToLine }, { t: "TRANSFER", l: "Transferir", Icon: ArrowLeftRight },
          ].map(({ t, l, Icon }) => <Link key={t} href={`${base}/expenses/new?type=${t}`} className="glass-btn"><Icon size={18} aria-hidden />{l}</Link>)}
        </div>}
      </section>

      <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
        <section className="flex flex-col justify-center py-2" aria-label="Ingresos, gastos y resultado">
          <RingGauge total={pyg.grossRevenue} expense={expense} label="Ingresos del mes" info={EXPLAIN.ring}>
            <span className="chip-solid">Margen {pct(pyg.contributionMarginPct)}</span>
            <span className="chip-solid">EBITDA {pct(pyg.ebitdaPct)}</span>
          </RingGauge>
        </section>
        <div className="grid gap-5 sm:grid-cols-2">
          <KpiCard info={EXPLAIN.cashFlow} title="Flujo de caja" value={cop(sum.cashFlow)} tone={sum.cashFlow < 0 ? "negative" : "positive"} hint="Ingresos − gastos del filtro" trend={series.map((s) => s.cash)} icon={<TrendingUp size={16} />} />
          <KpiCard info={EXPLAIN.margin} title="Margen de contribución" value={cop(pyg.contributionMargin)} hint={`${pct(pyg.contributionMarginPct)} de los ingresos`} trend={series.map((s) => s.margin)} icon={<TrendingUp size={16} />} />
          <KpiCard info={EXPLAIN.ebitda} title="EBITDA operativo" value={cop(pyg.ebitda)} tone={pyg.ebitda < 0 ? "negative" : undefined} hint={`${pct(pyg.ebitdaPct)} · CAPEX excluido`} trend={series.map((s) => s.ebitda)} icon={<TrendingUp size={16} />} />
          <KpiCard info={EXPLAIN.budgetExec} title="Ejecución del presupuesto" value={budget.totalBudget ? pct(budget.pct) : "—"} hint={budget.totalBudget ? `${cop(budget.totalActual)} de ${cop(budget.totalBudget)}` : "Define un presupuesto en la pestaña Presupuesto"} icon={<CalendarDays size={16} />}>
            {budget.totalBudget > 0 && <ProgressBar value={budget.pct} label="Ejecución del presupuesto" danger={budget.pct > 1} />}
          </KpiCard>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel min-w-0" aria-label="Principales gastos">
          <div className="mb-5 flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold">Principales gastos <InfoTip {...EXPLAIN.topExpenses} /></h2><Link className="text-sm text-white/80 underline" href={`${base}/stats`}>Ver todo</Link></div>
          {breakdown.items.length === 0 && <p className="text-sm text-white/70">Sin gastos en este periodo.</p>}
          <ul className="space-y-4">
            {breakdown.items.slice(0, 4).map((c, i) => (
              <li key={c.label} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-3"><Avatar name={c.label.replace(/^\p{Extended_Pictographic}\s*/u, "")} size={40} /><span className="min-w-0"><span className="block truncate font-medium">{c.label}</span><span className="block text-xs text-white/65">{breakdown.total ? Math.round((c.value / breakdown.total) * 100) : 0}% del total</span></span></span>
                <span className="text-right"><span className="block font-semibold">{cop(c.value)}</span><span className="text-xs text-accent">#{i + 1}</span></span>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel min-w-0" aria-label="Ingresos y gastos de los últimos 6 meses">
          <h2 className="mb-5 flex items-center gap-2 font-semibold">Últimos 6 meses <InfoTip {...EXPLAIN.sixMonths} /></h2>
          <StackedBars data={series} current={key} />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FolderCard className="min-w-0" tab="Por pagar" meta={<>{pending.length} pendiente(s)</>}>
          {pending.length === 0 && <p className="text-sm text-muted">Nada pendiente 🎉</p>}
          <ul className="space-y-1">
            {pending.map((t) => (
              <li key={t.id}><Link href={`${base}/transactions?sel=${t.id}&month=${t.date.toISOString().slice(0, 7)}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm hover:bg-white/30">
                <span className="truncate font-medium">{txTitle(t, "Movimiento", t.category?.name)} <span className="font-normal text-muted">· {fmtDate(t.date)}</span></span><span className="shrink-0 font-semibold">{cop(t.amount)}</span>
              </Link></li>
            ))}
          </ul>
          <Link className="mt-4 inline-block text-sm font-medium underline" href={`${base}/pending`}>Ver todos los pendientes</Link>
        </FolderCard>
        <RecentList workspaceId={workspaceId} rows={recent.rows} />
      </div>
    </>
  );
}

function RecentList({ workspaceId, rows }: { workspaceId: string; rows: Awaited<ReturnType<typeof searchTransactions>>["rows"] }) {
  return (
    <section className="panel space-y-4">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Actividad reciente</h2><Link className="text-sm text-white/80 underline" href={`/w/${workspaceId}/transactions`}>Ver todo</Link></div>
      {rows.length === 0 && <p className="text-sm text-white/70">Aún no hay movimientos este mes.</p>}
      <ul className="space-y-2">
        {rows.map((t) => (
          <li key={t.id}>
            <Link href={`/w/${workspaceId}/transactions?sel=${t.id}&month=${t.date.toISOString().slice(0, 7)}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm backdrop-blur hover:bg-white/20">
              <span className="flex min-w-0 items-center gap-3"><span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15">{t.category?.emoji ?? "💳"}</span><span className="min-w-0"><span className="block truncate font-medium">{txTitle(t, "Movimiento", t.category?.name)}</span><span className="block text-xs text-white/65">{txVendorHint(t) ? `${txVendorHint(t)} · ` : ""}{fmtDate(t.date)} · {t.account}</span></span></span>
              <span className={`shrink-0 font-semibold ${t.type === "INCOME" ? "text-accent" : ""}`}>{t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "−" : "↔"} {cop(t.amount)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
