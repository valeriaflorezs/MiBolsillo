import Link from "next/link";
import { IconButton } from "./icon-button";
import { monthLabel, shiftMonth } from "@/lib/format";

const STATUS = [
  { v: "PAID", l: "Pagado / Cobrado" },
  { v: "PENDING", l: "Por pagar / Por cobrar" },
  { v: "ALL", l: "Todo" },
];

export function Segmented({ items, current, label }: { items: { href: string; label: string; key: string }[]; current: string; label: string }) {
  return (
    <div role="group" aria-label={label} className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-pill glass-pill p-1 shadow-card">
      {items.map((s) => (
        <Link key={s.key} href={s.href} aria-current={current === s.key ? "true" : undefined}
          className={`whitespace-nowrap rounded-pill px-3 py-1.5 text-sm transition-colors ${current === s.key ? "bg-panel text-white shadow-glow" : "text-muted hover:text-ink"}`}>{s.label}</Link>
      ))}
    </div>
  );
}

export function MonthNav({ base, month, extra = "" }: { base: string; month: string; extra?: string }) {
  const q = (m: string) => `${base}?month=${m}${extra}`;
  return (
    <div className="flex w-fit items-center gap-1 rounded-pill glass-pill p-1 shadow-card">
      <Link href={q(shiftMonth(month, -1))} aria-label="Mes anterior" className="grid size-8 place-items-center rounded-full hover:bg-canvas">‹</Link>
      <span className="min-w-36 text-center text-sm font-medium first-letter:uppercase">{monthLabel(month)}</span>
      <Link href={q(shiftMonth(month, 1))} aria-label="Mes siguiente" className="grid size-8 place-items-center rounded-full hover:bg-canvas">›</Link>
    </div>
  );
}

export function Filters({ base, month, status, showStatus = true, x }: { base: string; month: string; status?: string; showStatus?: boolean; x?: string }) {
  const cur = status ?? "PAID";
  const xq = x ? `&x=${x}` : ""; // conserva el filtro de categorías al cambiar de mes o estado
  return (
    <div className="flex flex-wrap items-center gap-4">
      <MonthNav base={base} month={month} extra={(showStatus ? `&status=${cur}` : "") + xq} />
      {showStatus && <Segmented label="Estado" current={cur} items={STATUS.map((s) => ({ key: s.v, label: s.l, href: `${base}?month=${month}&status=${s.v}${xq}` }))} />}
    </div>
  );
}

type Opt = { id: string; name: string };
const sel = "input !h-10 !py-0 text-sm";

/** Barra de filtros del resumen en una sola línea: mes, categoría, cuenta, propiedad y estado; el embudo aplica. */
export function SummaryFilters({ base, month, cat, acc, prop, status, cats, accs, props }: { base: string; month: string; cat?: string; acc?: string; prop?: string; status: string; cats: Opt[]; accs: Opt[]; props: Opt[] }) {
  const extra = Object.entries({ status, cat, acc, prop }).filter(([, v]) => v).map(([k, v]) => `&${k}=${encodeURIComponent(v as string)}`).join("");
  return (
    <div className="card flex flex-wrap items-center gap-3 !p-3 lg:flex-nowrap">
      <MonthNav base={base} month={month} extra={extra} />
      <form action={base} role="search" aria-label="Filtrar resumen" className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:flex-nowrap">
        <input type="hidden" name="month" value={month} />
        <select name="cat" defaultValue={cat ?? ""} aria-label="Categoría" className={`${sel} min-w-0 flex-1`}><option value="">Categoría: todas</option><option value="__none">Sin categoría</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="acc" defaultValue={acc ?? ""} aria-label="Cuenta" className={`${sel} min-w-0 flex-1`}><option value="">Cuenta: todas</option>{accs.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        {props.length > 0 && <select name="prop" defaultValue={prop ?? ""} aria-label="Propiedad" className={`${sel} min-w-0 flex-1`}><option value="">Propiedad: todas</option><option value="__none">Sin propiedad</option>{props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
        <select name="status" defaultValue={status} aria-label="Estado" className={`${sel} min-w-0 flex-1`}>{STATUS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select>
        <IconButton type="submit" icon="filter" label="Filtrar" tone="primary" />
      </form>
    </div>
  );
}
