import { cop } from "@/lib/format";
import type { ScheduleRow } from "@/lib/finance/loan";

const short = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}k`);

/** Cuotas del plan: capital (abajo) e intereses (arriba). Las ya pagadas van en color pleno; las futuras, atenuadas. */
export function AmortizationChart({ rows, paidCount }: { rows: ScheduleRow[]; paidCount: number }) {
  if (!rows.length) return null;
  const max = Math.max(1, ...rows.map((r) => r.payment));
  const step = Math.ceil(rows.length / 12);
  return (
    <div>
      <div className="relative h-40" role="img" aria-label={`Plan de ${rows.length} cuotas: ${paidCount} pagadas. Cuota de ${cop(rows[0].payment)}, con intereses de ${cop(rows[0].interest)} la primera y ${cop(rows[rows.length - 1].interest)} la última.`}>
        <div className="absolute inset-0 flex flex-col justify-between" aria-hidden>
          {[1, 0.5, 0].map((t) => <div key={t} className="flex items-center gap-2"><span className="h-px flex-1 border-t border-dashed border-line" /><span className="w-12 text-right text-[11px] text-muted">{short(max * t)}</span></div>)}
        </div>
        <div className="absolute inset-y-0 left-0 right-14 flex items-end gap-px sm:gap-0.5" aria-hidden>
          {rows.map((r, i) => (
            <div key={r.n} className={`flex h-full min-w-0 flex-1 flex-col justify-end ${i < paidCount ? "" : "opacity-45"}`} title={`Cuota ${r.n}: capital ${cop(r.principal)} + intereses ${cop(r.interest)}`}>
              <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-sm" style={{ height: `${(r.payment / max) * 100}%` }}>
                <div className="bg-accent" style={{ flexGrow: r.interest }} />
                <div className="bg-brand" style={{ flexGrow: r.principal }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mr-14 mt-2 flex gap-px text-[10px] text-muted sm:gap-0.5" aria-hidden>
        {rows.map((r, i) => <span key={r.n} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">{i % step === 0 ? `${r.date.toISOString().slice(5, 7)}/${r.date.toISOString().slice(2, 4)}` : ""}</span>)}
      </div>
      <p className="mt-3 flex flex-wrap gap-4 text-xs text-muted" aria-hidden>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-brand" />Capital</span>
        <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-accent" />Intereses</span>
        <span>Color pleno = cuotas ya pagadas</span>
      </p>
    </div>
  );
}
