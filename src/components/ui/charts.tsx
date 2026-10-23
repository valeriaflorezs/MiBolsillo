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
