import { cop, monthLabel } from "@/lib/format";

type Point = { month: string; income: number; expense: number };

/** Barras de ingresos (celeste) vs gastos (navy). Incluye tabla accesible para lectores de pantalla. */
export function BarChart({ data, current, labelOf }: { data: Point[]; current: string; labelOf?: (k: string) => string }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const label = labelOf ?? ((k: string) => k.slice(5));
  return (
    <div>
      <div className="flex h-44 items-end gap-1 sm:gap-2" aria-hidden>
        {data.map((d, i) => (
          <div key={d.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-36 w-full items-end justify-center gap-px sm:gap-0.5">
              <div className={`w-full max-w-5 rounded-t-md ${d.month === current ? "bg-accent" : "bg-accent/50"}`} style={{ height: `${(d.income / max) * 100}%` }} />
              <div className="w-full max-w-5 rounded-t-md bg-panel" style={{ height: `${(d.expense / max) * 100}%` }} />
            </div>
            <span className="h-4 text-xs text-muted">{data.length <= 12 || i % 5 === 0 ? label(d.month) : ""}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 flex gap-4 text-xs text-muted" aria-hidden>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-accent" />Ingresos</span>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-panel" />Gastos</span>
      </p>
      <table className="sr-only">
        <caption>Ingresos y gastos por periodo</caption>
        <thead><tr><th>Periodo</th><th>Ingresos</th><th>Gastos</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.month}><td>{d.month.length === 7 ? monthLabel(d.month) : d.month}</td><td>{cop(d.income)}</td><td>{cop(d.expense)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function ProgressRing({ value, label }: { value: number; label: string }) {
  const r = 34, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <div role="img" aria-label={`${label}: ${Math.round(v * 100)}%`} className="relative size-24 shrink-0">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-line" />
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-brand" strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-lg font-semibold">{Math.round(v * 100)}%</span>
    </div>
  );
}

const shortMoney = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${Math.round(n)}`);

/** Barras apiladas para panel oscuro: gastos (celeste) + resultado (translúcido) = ingresos. Rejilla punteada y eje a la derecha. */
export function StackedBars({ data, current }: { data: { month: string; income: number; expense: number }[]; current: string }) {
  const max = Math.max(1, ...data.map((d) => d.income));
  const ticks = [1, 2 / 3, 1 / 3, 0];
  const labels = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  return (
    <div>
      <div className="relative h-44">
        <div className="absolute inset-0 flex flex-col justify-between" aria-hidden>
          {ticks.map((t) => <div key={t} className="flex items-center gap-2"><span className="h-px flex-1 border-t border-dashed border-white/25" /><span className="w-12 text-right text-[11px] text-white/70">{shortMoney(max * t)}</span></div>)}
        </div>
        <div className="absolute inset-y-0 left-0 right-14 flex items-end gap-2 sm:gap-4" aria-hidden>
          {data.map((d) => {
            const exp = Math.min(d.expense, d.income), res = Math.max(d.income - d.expense, 0);
            return (
              <div key={d.month} className="flex h-full flex-1 flex-col justify-end">
                <div className="mx-auto flex w-full max-w-9 flex-col justify-end overflow-hidden rounded-md" style={{ height: `${(Math.max(d.income, d.expense) / max) * 100}%` }}>
                  <div className="bg-white/35" style={{ flexGrow: res }} />
                  <div className={d.month === current ? "bg-accent" : "bg-accent/80"} style={{ flexGrow: d.expense > d.income ? 1 : exp }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mr-14 mt-3 flex gap-2 text-center text-[11px] text-white/70 sm:gap-4" aria-hidden>
        {data.map((d) => <span key={d.month} className="flex-1">{labels[Number(d.month.slice(5)) - 1]}</span>)}
      </div>
      <p className="mt-5 flex gap-5 text-xs text-white/70" aria-hidden>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-accent" />Gastos</span>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-white/35" />Resultado</span>
      </p>
      <table className="sr-only">
        <caption>Ingresos, gastos y resultado por mes</caption>
        <thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.month}><td>{monthLabel(d.month)}</td><td>{cop(d.income)}</td><td>{cop(d.expense)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
