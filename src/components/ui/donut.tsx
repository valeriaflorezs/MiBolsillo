import { cop } from "@/lib/format";

export const DONUT_COLORS = ["#1d4e9c", "#7db4ee", "#0b2654", "#4f8fe0", "#a9cdf5", "#2f6fcb", "#6b7fa8", "#c3d5ee"];

export type DonutItem = { label: string; value: number };

/** Dona con leyenda textual (la información no depende solo del color). */
export function Donut({ items, total }: { items: DonutItem[]; total: number }) {
  const r = 52, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 140 140" className="size-full -rotate-90" role="img" aria-label={`Distribución de ${cop(total)} en ${items.length} categorías`}>
          <circle cx="70" cy="70" r={r} fill="none" strokeWidth="16" className="stroke-line" />
          {total > 0 && items.map((it, i) => {
            const len = (it.value / total) * c;
            const el = <circle key={it.label} cx="70" cy="70" r={r} fill="none" strokeWidth="16" stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeDasharray={`${Math.max(len - 2, 0)} ${c}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div><p className="text-xs text-muted">Total</p><p className="text-sm font-semibold">{cop(total)}</p></div>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2 text-sm">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2"><span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} /><span className="truncate">{it.label}</span></span>
            <span className="shrink-0 text-muted">{cop(it.value)} · {total ? Math.round((it.value / total) * 100) : 0}%</span>
          </li>
        ))}
        {items.length === 0 && <li className="text-muted">Sin datos en este periodo.</li>}
      </ul>
    </div>
  );
}
