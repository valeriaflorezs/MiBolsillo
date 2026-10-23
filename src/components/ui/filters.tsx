import Link from "next/link";
import { monthLabel, shiftMonth } from "@/lib/format";

const STATUS = [
  { v: "PAID", l: "Pagado / Cobrado" },
  { v: "PENDING", l: "Por pagar / Por cobrar" },
  { v: "ALL", l: "Todo" },
];

export function Filters({ base, month, status, showStatus = true }: { base: string; month: string; status?: string; showStatus?: boolean }) {
  const q = (m: string, s?: string) => `${base}?month=${m}${showStatus && s ? `&status=${s}` : ""}`;
  const cur = status ?? "PAID";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 rounded-pill bg-surface p-1 shadow-card">
        <Link href={q(shiftMonth(month, -1), cur)} aria-label="Mes anterior" className="grid size-8 place-items-center rounded-full hover:bg-canvas">‹</Link>
        <span className="min-w-36 text-center text-sm font-medium capitalize">{monthLabel(month)}</span>
        <Link href={q(shiftMonth(month, 1), cur)} aria-label="Mes siguiente" className="grid size-8 place-items-center rounded-full hover:bg-canvas">›</Link>
      </div>
      {showStatus && (
        <div role="group" aria-label="Estado" className="flex gap-1 rounded-pill bg-surface p-1 shadow-card">
          {STATUS.map((s) => (
            <Link key={s.v} href={q(month, s.v)} aria-current={cur === s.v ? "true" : undefined}
              className={`rounded-pill px-3 py-1.5 text-sm ${cur === s.v ? "bg-ink text-surface" : "text-muted hover:text-ink"}`}>{s.l}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
