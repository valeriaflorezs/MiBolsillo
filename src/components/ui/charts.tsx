import { cop, monthLabel } from "@/lib/format";

type Point = { month: string; income: number; expense: number };

/** Barras de ingresos vs gastos. Incluye tabla accesible para lectores de pantalla. */
export function BarChart({ data, current }: { data: Point[]; current: string }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  return (
    <div>
      <div className="flex h-44 items-end gap-3" aria-hidden>
        {data.map((d) => (
          <div key={d.month} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-36 w-full items-end justify-center gap-1">
              <div className={`w-3 rounded-t sm:w-5 ${d.month === current ? "bg-brand" : "bg-ink/20"}`} style={{ height: `${(d.income / max) * 100}%` }} />
              <div className="w-3 rounded-t bg-ink/60 sm:w-5" style={{ height: `${(d.expense / max) * 100}%` }} />
            </div>
            <span className="text-xs text-muted">{d.month.slice(5)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 flex gap-4 text-xs text-muted" aria-hidden><span>▮ Ingresos</span><span>▮ Gastos</span></p>
      <table className="sr-only">
        <caption>Ingresos y gastos de los últimos 6 meses</caption>
        <thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.month}><td>{monthLabel(d.month)}</td><td>{cop(d.income)}</td><td>{cop(d.expense)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function ProgressRing({ value, label }: { value: number; label: string }) {
  const r = 34, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <div role="img" aria-label={`${label}: ${Math.round(v * 100)}%`} className="relative size-24">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-line" />
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-brand" strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-lg font-semibold">{Math.round(v * 100)}%</span>
    </div>
  );
}
