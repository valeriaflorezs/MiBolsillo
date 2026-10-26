import Link from "next/link";
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
