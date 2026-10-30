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
const SEL = "input !h-10 !py-0 text-sm min-w-0 flex-1";

/** Barra de filtros de una sola línea: `lead` (mes/periodo) + campos + embudo que aplica (y, si hay filtros, una «x» para limpiar). */
export function FilterBar({ action, hidden = {}, lead, clearHref, label = "Filtrar", children }: { action: string; hidden?: Record<string, string | undefined>; lead?: React.ReactNode; clearHref?: string; label?: string; children: React.ReactNode }) {
  return (
    <div className="card flex flex-wrap items-center gap-3 !p-3 lg:flex-nowrap">
      {lead}
      <form action={action} role="search" aria-label={label} className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:flex-nowrap">
        {Object.entries(hidden).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
        {children}
        <IconButton type="submit" icon="filter" label="Filtrar" tone="primary" />
        {clearHref && <IconButton href={clearHref} icon="close" label="Quitar filtros" />}
      </form>
    </div>
  );
}

/** Selector de la barra: con `all` ofrece «<all>» (valor vacío) y, con `none`, una opción para lo que no tiene valor. */
export function FilterSelect({ name, label, value, options, all, none }: { name: string; label: string; value?: string; options: { id: string; name: string }[]; all?: string; none?: string }) {
  return (
    <select name={name} defaultValue={value ?? ""} aria-label={label} className={SEL}>
      {all && <option value="">{all}</option>}
      {none && <option value="__none">{none}</option>}
      {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

export function FilterSearch({ name, value, placeholder }: { name: string; value?: string; placeholder: string }) {
  return <input name={name} defaultValue={value} placeholder={placeholder} aria-label="Buscar" className={`${SEL} basis-40 [flex:2_1_10rem]`} />;
}

export const STATUS_OPTIONS = STATUS.map((s) => ({ id: s.v, name: s.l }));

/** Filtro del resumen: mes, categoría, cuenta, propiedad y estado. */
export function SummaryFilters({ base, month, cat, acc, prop, status, cats, accs, props }: { base: string; month: string; cat?: string; acc?: string; prop?: string; status: string; cats: Opt[]; accs: Opt[]; props: Opt[] }) {
  const extra = Object.entries({ status, cat, acc, prop }).filter(([, v]) => v).map(([k, v]) => `&${k}=${encodeURIComponent(v as string)}`).join("");
  return (
    <FilterBar action={base} hidden={{ month }} label="Filtrar resumen" lead={<MonthNav base={base} month={month} extra={extra} />}>
      <FilterSelect name="cat" label="Categoría" value={cat} options={cats} all="Categoría: todas" none="Sin categoría" />
      <FilterSelect name="acc" label="Cuenta" value={acc} options={accs} all="Cuenta: todas" />
      {props.length > 0 && <FilterSelect name="prop" label="Propiedad" value={prop} options={props} all="Propiedad: todas" none="Sin propiedad" />}
      <FilterSelect name="status" label="Estado" value={status} options={STATUS_OPTIONS} />
    </FilterBar>
  );
}
