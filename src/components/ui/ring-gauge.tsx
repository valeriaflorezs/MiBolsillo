import { BarChart3, TrendingUp, Wallet } from "lucide-react";
import { cop } from "@/lib/format";

const CX = 150, CY = 150, R = 108, SW = 38;
const rad = (deg: number) => ((deg - 90) * Math.PI) / 180; // 0° = arriba, sentido horario
const pt = (deg: number, r = R) => [CX + r * Math.cos(rad(deg)), CY + r * Math.sin(rad(deg))];
const arc = (a: number, b: number) => {
  const [x1, y1] = pt(a), [x2, y2] = pt(b);
  return `M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${b - a > 180 ? 1 : 0} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
};
const short = (n: number) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${Math.round(n)}`);

/** Anillo con hueco superior y dos tramos (gastos vs resultado); las cifras van en una leyenda horizontal, no sobre el arco. */
export function RingGauge({ total, expense, label, children }: { total: number; expense: number; label: string; children?: React.ReactNode }) {
  const result = Math.max(0, total - expense);
  const base = Math.max(total, expense, 1);
  const START = 28, SWEEP = 304, GAP = 3;
  const CAP = ((SW / 2) / R) * (180 / Math.PI); // los extremos redondeados se salen del tramo ±CAP grados
  const eSweep = (Math.min(expense, base) / base) * SWEEP;
  const mid = START + eSweep;
  const segs = [
    { id: "g", from: START, to: expense > 0 && result > 0 ? mid - CAP - GAP / 2 : START + eSweep, fill: "rgb(var(--ring-a))", name: "Gastos", value: expense },
    { id: "r", from: result > 0 && expense > 0 ? mid + CAP + GAP / 2 : mid, to: START + SWEEP, fill: "rgb(var(--ring-b))", name: "Resultado", value: result },
  ];
  return (
    <figure className="relative mx-auto w-full max-w-sm pt-9">
      <div aria-hidden className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 gap-3">
        {[BarChart3, TrendingUp, Wallet].map((Icon, i) => (
          <span key={i} className={`grid size-11 place-items-center border border-white/50 bg-white/25 text-ink backdrop-blur-md ${i === 1 ? "rounded-b-2xl rounded-t-md" : "rounded-2xl"}`} style={{ boxShadow: "inset 0 1px 0 rgb(255 255 255 / .6)" }}><Icon size={18} /></span>
        ))}
      </div>
      <svg viewBox="0 0 300 300" className="w-full" role="img" aria-label={`${label}: ingresos ${cop(total)}, gastos ${cop(expense)}, resultado ${cop(result)}`}>
        <path d={arc(START, START + SWEEP)} stroke="rgb(255 255 255 / .22)" strokeWidth={SW} fill="none" strokeLinecap="round" />
        {segs.filter((s) => s.value > 0).map((s) => <path key={s.id} d={arc(s.from, Math.max(s.to, s.from + 0.01))} style={{ stroke: s.fill }} strokeWidth={SW} fill="none" strokeLinecap="round" />)}
        <text x="150" y="146" textAnchor="middle" fontSize="34" fontWeight="700" style={{ fill: "rgb(var(--ring-center))" }}>{short(total)}</text>
        <text x="150" y="172" textAnchor="middle" fontSize="12" style={{ fill: "rgb(var(--ring-sub))" }}>{label}</text>
      </svg>
      <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
        {segs.map((s) => <li key={s.id} className="flex items-center gap-2"><span aria-hidden className="size-3 rounded-full" style={{ background: s.fill }} />{s.name} <strong>{short(s.value)}</strong></li>)}
      </ul>
      {children && <figcaption className="mt-4 flex flex-wrap justify-center gap-3">{children}</figcaption>}
    </figure>
  );
}
