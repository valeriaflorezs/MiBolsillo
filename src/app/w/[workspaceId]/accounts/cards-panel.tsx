import { CalendarClock, CreditCard, Percent, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { Chip } from "@/components/ui/chip";
import { KpiCard } from "@/components/ui/kpi-card";
import { ProgressBar } from "@/components/ui/progress";
import { prisma } from "@/lib/db";
import { cardSummary } from "@/lib/finance/card";
import { cop, fmtDate, inputDate, num, pct, todayUtc } from "@/lib/format";
import { chargeCardFeesAction, createCardAction, payCardAction, updateCardAction } from "@/modules/cards/actions";
import type { accountBalances } from "@/modules/core/queries";

type Balances = Awaited<ReturnType<typeof accountBalances>>;
type CardRow = Awaited<ReturnType<typeof prisma.financialAccount.findMany>>[number];

function CardFields({ card, debt, idp }: { card?: CardRow; debt?: number; idp: string }) {
  const f = (n: string) => `${idp}${n}`;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div><label className="label" htmlFor={f("name")}>Nombre</label><input id={f("name")} name="name" required defaultValue={card?.name} className="input" placeholder="Visa Bancolombia" /></div>
      <div><label className="label" htmlFor={f("limit")}>Cupo total</label><input id={f("limit")} name="creditLimit" type="number" min="0" step="any" defaultValue={card?.creditLimit ? num(card.creditLimit) : undefined} className="input" /></div>
      <div><label className="label" htmlFor={f("debt")}>Deuda actual</label><input id={f("debt")} name="debt" type="number" min="0" step="any" defaultValue={debt || undefined} className="input" placeholder="Lo que debes hoy" /></div>
      <div><label className="label" htmlFor={f("cut")}>Día de corte</label><input id={f("cut")} name="cutoffDay" type="number" min="1" max="31" step="1" defaultValue={card?.cutoffDay ?? undefined} className="input" placeholder="Ej. 15" /></div>
      <div><label className="label" htmlFor={f("pay")}>Día límite de pago</label><input id={f("pay")} name="paymentDay" type="number" min="1" max="31" step="1" defaultValue={card?.paymentDay ?? undefined} className="input" placeholder="Ej. 30" /></div>
      <div><label className="label" htmlFor={f("rate")}>Tasa de interés (%)</label><input id={f("rate")} name="ratePct" type="number" min="0" max="100" step="any" defaultValue={card?.ratePct ? num(card.ratePct) : undefined} className="input" /></div>
      <div><label className="label" htmlFor={f("rt")}>Tipo de tasa</label><select id={f("rt")} name="rateType" defaultValue={card?.rateType ?? "EFFECTIVE_ANNUAL"} className="input"><option value="EFFECTIVE_ANNUAL">Efectiva anual (E.A.)</option><option value="MONTHLY">Mensual</option></select></div>
      <div><label className="label" htmlFor={f("fee")}>Cuota de manejo mensual</label><input id={f("fee")} name="managementFeeMonthly" type="number" min="0" step="any" defaultValue={card?.managementFeeMonthly ? num(card.managementFeeMonthly) : undefined} className="input" /></div>
      <div><label className="label" htmlFor={f("ins")}>Seguro mensual</label><input id={f("ins")} name="insuranceMonthly" type="number" min="0" step="any" defaultValue={card?.insuranceMonthly ? num(card.insuranceMonthly) : undefined} className="input" /></div>
    </div>
  );
}

export async function CardsPanel({ workspaceId, accounts, canEdit }: { workspaceId: string; accounts: Balances; canEdit: boolean }) {
  const today = todayUtc();
  const cards = await prisma.financialAccount.findMany({ where: { workspaceId, type: "CREDIT_CARD" }, orderBy: { createdAt: "asc" } });
  const bal = new Map(accounts.map((a) => [a.id, a.balance]));
  const payFrom = accounts.filter((a) => a.type !== "CREDIT_CARD" && !a.archived);
  const month = today.toISOString().slice(0, 7);
  const rows = await Promise.all(cards.map(async (c) => {
    const s = cardSummary({ creditLimit: c.creditLimit ? num(c.creditLimit) : null, cutoffDay: c.cutoffDay, paymentDay: c.paymentDay, rateType: c.rateType, ratePct: c.ratePct ? num(c.ratePct) : null, insuranceMonthly: c.insuranceMonthly ? num(c.insuranceMonthly) : null, managementFeeMonthly: c.managementFeeMonthly ? num(c.managementFeeMonthly) : null }, bal.get(c.id) ?? 0, today);
    const spent = s.lastCutoff
      ? num((await prisma.transaction.aggregate({ where: { workspaceId, accountId: c.id, type: "EXPENSE", status: "PAID", date: { gt: s.lastCutoff } }, _sum: { amount: true } }))._sum.amount ?? 0)
      : null;
    return { c, s, spent };
  }));
  const active = rows.filter((r) => !r.c.archived);

  return (
    <>
      <p className="text-muted">Cada tarjeta es una cuenta: tus compras con ella se registran como gastos en <Link className="underline" href={`/w/${workspaceId}/expenses/new`}>Movimientos</Link> eligiéndola como cuenta, y su pago es una transferencia desde tu banco.</p>
      {active.length === 0 && <p className="card text-muted">Aún no has registrado tarjetas de crédito.</p>}
      {rows.map(({ c, s, spent }) => (
        <section key={c.id} className={`space-y-5 ${c.archived ? "opacity-60" : ""}`} aria-label={c.name}>
          <div className="hero">
            <p className="flex items-center gap-2 text-sm text-white/80"><CreditCard size={15} aria-hidden />{c.name}{c.archived && <Chip>Archivada</Chip>}</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">{cop(s.debt)}</p>
            <p className="text-sm text-white/75">{s.credit > 0 ? `Saldo a favor ${cop(s.credit)}` : "Deuda actual"}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {s.nextCutoff && <span className="chip-outline">Corte: {fmtDate(s.nextCutoff)}</span>}
              {s.nextDue && <span className="chip-outline">Pagar antes del {fmtDate(s.nextDue)}{s.daysToDue !== null && s.debt > 0 ? ` · ${s.daysToDue === 0 ? "hoy" : `en ${s.daysToDue} día(s)`}` : ""}</span>}
              {s.utilization !== null && <span className="chip-outline">{pct(s.utilization)} del cupo usado</span>}
            </div>
            {s.limit !== null && (
              <div className="mt-6"><div className="h-2.5 w-full overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, (s.utilization ?? 0) * 100)}%` }} /></div>
                <p className="mt-2 flex justify-between text-xs text-white/75"><span>Disponible {cop(s.available ?? 0)}</span><span>Cupo {cop(s.limit)}</span></p></div>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Compras desde el corte" value={spent === null ? "—" : cop(spent)} hint={s.lastCutoff ? `desde el ${fmtDate(s.lastCutoff)}` : "Define el día de corte"} icon={<ShoppingBag size={16} />} />
            <KpiCard title="Cargos mensuales" value={cop(s.fees)} hint={s.fees ? "Cuota de manejo + seguro" : "Sin cuota de manejo ni seguro"} icon={<CalendarClock size={16} />} />
            <KpiCard title="Intereses si no pagas" value={s.interestIfUnpaid === null ? "—" : cop(s.interestIfUnpaid)} hint={s.interestIfUnpaid === null ? "Define la tasa de interés" : "Estimado de un mes sobre la deuda actual"} icon={<Percent size={16} />} />
            <KpiCard title="Cupo disponible" value={s.available === null ? "—" : cop(s.available)} hint={s.limit === null ? "Define el cupo total" : `de ${cop(s.limit)}`} icon={<CreditCard size={16} />} />
          </div>

          <div className="flex flex-wrap gap-3"><Link className="btn btn-ghost" href={`/w/${workspaceId}/transactions?acc=${c.id}`}>Ver movimientos de la tarjeta</Link></div>

          {canEdit && !c.archived && (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="card space-y-3">
                <h3 className="font-medium">Pagar la tarjeta</h3>
                <ActionForm action={payCardAction} submitLabel="Registrar pago" className="space-y-3">
                  <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="cardId" value={c.id} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div><label className="label" htmlFor={`pf${c.id}`}>Pagar desde</label><select id={`pf${c.id}`} name="fromAccountId" required className="input">{payFrom.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                    <div><label className="label" htmlFor={`pa${c.id}`}>Valor</label><input id={`pa${c.id}`} name="amount" type="number" min="1" step="any" required defaultValue={s.debt > 0 ? Math.round(s.debt) : undefined} className="input" /></div>
                    <div><label className="label" htmlFor={`pd${c.id}`}>Fecha</label><input id={`pd${c.id}`} name="date" type="date" required defaultValue={inputDate(today)} className="input" /></div>
                  </div>
                </ActionForm>
              </div>
              <div className="card space-y-3">
                <h3 className="font-medium">Cargar cuota de manejo, seguro e intereses</h3>
                <p className="text-sm text-muted">Los suma a la deuda como gastos financieros (no entran al EBITDA). Si repites el mes, no duplica.</p>
                <ActionForm action={chargeCardFeesAction} submitLabel="Cargar al mes" className="space-y-3">
                  <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="cardId" value={c.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><label className="label" htmlFor={`cm${c.id}`}>Mes</label><input id={`cm${c.id}`} name="month" type="month" required defaultValue={month} className="input" /></div>
                    <div><label className="label" htmlFor={`ci${c.id}`}>Intereses del extracto (opcional)</label><input id={`ci${c.id}`} name="interest" type="number" min="0" step="any" className="input" placeholder={s.interestIfUnpaid ? `≈ ${Math.round(s.interestIfUnpaid)}` : undefined} /></div>
                  </div>
                </ActionForm>
              </div>
            </div>
          )}
          {canEdit && (
            <details className="card">
              <summary className="cursor-pointer font-medium">Editar {c.name}</summary>
              <ActionForm action={updateCardAction} submitLabel="Guardar cambios" resetOnSuccess={false} className="mt-4 space-y-4">
                <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="cardId" value={c.id} />
                <CardFields card={c} debt={c.openingBalance ? -num(c.openingBalance) : 0} idp={`e${c.id}`} />
                <p className="text-xs text-muted">«Deuda actual» es el saldo con el que empezaste a llevar la tarjeta aquí; las compras y pagos se suman encima.</p>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="archived" defaultChecked={c.archived} />Archivar (se oculta de los formularios)</label>
              </ActionForm>
            </details>
          )}
        </section>
      ))}
      {canEdit && (
        <section className="card space-y-4">
          <h2 className="font-medium">Agregar tarjeta de crédito</h2>
          <ActionForm action={createCardAction} submitLabel="Crear tarjeta"><input type="hidden" name="workspaceId" value={workspaceId} /><CardFields idp="new" /></ActionForm>
        </section>
      )}
    </>
  );
}
