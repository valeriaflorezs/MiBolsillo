import { CalendarClock, Landmark, Percent, PiggyBank } from "lucide-react";
import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { FormDialog } from "@/components/forms/form-dialog";
import { IconAction } from "@/components/forms/icon-action";
import { Icon } from "@/components/ui/icons";
import { AmortizationChart } from "@/components/ui/amortization-chart";
import { Chip } from "@/components/ui/chip";
import { FolderCard } from "@/components/ui/folder-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { ProgressBar } from "@/components/ui/progress";
import { prisma } from "@/lib/db";
import { loanSummary, type LoanTerms } from "@/lib/finance/loan";
import { cop, fmtDate, inputDate, num, pct, todayUtc } from "@/lib/format";
import { addAllocationAction, addPaymentAction, createLoanAction, deleteAllocationAction, deleteLoanAction, deletePaymentAction, updateLoanAction } from "@/modules/debt/actions";
import { EXPLAIN } from "@/lib/explain";
import { InfoTip } from "@/components/ui/info-tip";

const RATE_LABEL = { EFFECTIVE_ANNUAL: "E.A.", MONTHLY: "mensual" } as const;
type LoanRow = Awaited<ReturnType<typeof prisma.loan.findMany>>[number];

function LoanFields({ loan }: { loan?: LoanRow }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div><label className="label" htmlFor="name">Nombre</label><input id="name" name="name" required defaultValue={loan?.name} className="input" placeholder="Préstamo Banco" /></div>
      <div><label className="label" htmlFor="lender">Banco</label><input id="lender" name="lender" defaultValue={loan?.lender ?? ""} className="input" placeholder="Bancolombia" /></div>
      <div><label className="label" htmlFor="principal">Monto del crédito</label><input id="principal" name="principal" type="number" max="1000000000000" min="0.01" step="0.01" required defaultValue={loan ? num(loan.principal) : undefined} className="input" /></div>
      <div><label className="label" htmlFor="ratePct">Tasa de interés (%)</label><input id="ratePct" name="ratePct" type="number" min="0" max="100" step="0.0001" required defaultValue={loan ? num(loan.ratePct) : undefined} className="input" /></div>
      <div><label className="label" htmlFor="rateType">Tipo de tasa</label>
        <select id="rateType" name="rateType" defaultValue={loan?.rateType ?? "EFFECTIVE_ANNUAL"} className="input"><option value="EFFECTIVE_ANNUAL">Efectiva anual (E.A.)</option><option value="MONTHLY">Mensual</option></select></div>
      <div><label className="label" htmlFor="termMonths">Plazo (meses)</label><input id="termMonths" name="termMonths" type="number" min="1" max="600" step="1" required defaultValue={loan?.termMonths} className="input" /></div>
      <div><label className="label" htmlFor="firstPaymentDate">Fecha de la primera cuota</label><input id="firstPaymentDate" name="firstPaymentDate" type="date" required defaultValue={loan ? inputDate(loan.firstPaymentDate) : undefined} className="input" /></div>
      <div><label className="label" htmlFor="monthlyPayment">Cuota del banco (opcional)</label><input id="monthlyPayment" name="monthlyPayment" type="number" max="1000000000000" min="0" step="0.01" defaultValue={loan?.monthlyPayment ? num(loan.monthlyPayment) : undefined} className="input" placeholder="Si la dejas vacía, se calcula" /></div>
      <div><label className="label" htmlFor="insuranceMonthly">Seguro mensual (opcional)</label><input id="insuranceMonthly" name="insuranceMonthly" type="number" max="1000000000000" min="0" step="0.01" defaultValue={loan?.insuranceMonthly ? num(loan.insuranceMonthly) : undefined} className="input" placeholder="Seguro de vida / deudores" /></div>
      <div><label className="label" htmlFor="managementFeeMonthly">Cuota de manejo mensual (opcional)</label><input id="managementFeeMonthly" name="managementFeeMonthly" type="number" max="1000000000000" min="0" step="0.01" defaultValue={loan?.managementFeeMonthly ? num(loan.managementFeeMonthly) : undefined} className="input" placeholder="Tarjetas de crédito" /></div>
      <div><label className="label" htmlFor="notes">Notas</label><input id="notes" name="notes" defaultValue={loan?.notes ?? ""} className="input" /></div>
    </div>
  );
}

export async function LoansPanel({ workspaceId, loanId, canEdit }: { workspaceId: string; loanId?: string; canEdit: boolean }) {
  const loans = await prisma.loan.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } });
  const base = `/w/${workspaceId}/accounts?t=creditos`;

  if (!loans.length) {
    return (
      <>
        <div className="flex items-start justify-between gap-3">
          <p className="text-muted">Monitorea el saldo, las cuotas y el destino del dinero de tu crédito.</p>
          {canEdit && <FormDialog label="Registrar el crédito" title="Registrar el crédito" wide><ActionForm action={createLoanAction} submitLabel="Crear crédito"><input type="hidden" name="workspaceId" value={workspaceId} /><LoanFields /></ActionForm></FormDialog>}
        </div>
        <p className="card text-muted">Aún no hay créditos registrados.</p>
      </>
    );
  }

  const loan = loans.find((l) => l.id === loanId) ?? loans[0];
  const [payments, allocations] = await Promise.all([
    prisma.loanPayment.findMany({ where: { loanId: loan.id }, orderBy: { date: "asc" } }),
    prisma.loanAllocation.findMany({ where: { loanId: loan.id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  const terms: LoanTerms = { principal: num(loan.principal), rateType: loan.rateType, ratePct: num(loan.ratePct), termMonths: loan.termMonths, firstPaymentDate: loan.firstPaymentDate, monthlyPayment: loan.monthlyPayment ? num(loan.monthlyPayment) : null, insuranceMonthly: loan.insuranceMonthly ? num(loan.insuranceMonthly) : null, managementFeeMonthly: loan.managementFeeMonthly ? num(loan.managementFeeMonthly) : null };
  const s = loanSummary(terms, payments.map((p) => ({ id: p.id, date: p.date, kind: p.kind, amount: num(p.amount), interestOverride: p.interestOverride ? num(p.interestOverride) : null, fees: p.fees ? num(p.fees) : null })), todayUtc());
  const allocTotal = allocations.reduce((a, x) => a + num(x.amount), 0);
  const paidOff = s.balance <= 0.5;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-muted">{loan.name}{loan.lender ? ` · ${loan.lender}` : ""} · {num(loan.ratePct)}% {RATE_LABEL[loan.rateType]} · {loan.termMonths} meses</p></div>
        {loans.length > 1 && (
          <nav aria-label="Créditos" className="flex flex-wrap gap-2">
            {loans.map((l) => <Link key={l.id} href={`${base}&l=${l.id}`} aria-current={l.id === loan.id ? "page" : undefined} className={l.id === loan.id ? "btn btn-primary" : "btn btn-ghost"}>{l.name}</Link>)}
          </nav>
        )}
      </div>

      <section className="hero" aria-label="Saldo pendiente">
        <p className="flex items-center gap-1.5 text-sm text-white/80">{paidOff ? <><span>Crédito saldado</span><Icon name="celebration" size={16} /></> : "Saldo pendiente"} <InfoTip {...EXPLAIN.loanProgress} /></p>
        <p className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">{cop(s.balance)}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="chip-outline">{pct(s.pctPaid)} del capital pagado</span>
          <span className="chip-outline">Cuota {Math.min(s.installmentsPaid, s.plan.length)} de {s.plan.length}</span>
          {s.overdue > 0 && <span className="chip-outline">{s.overdue} cuota(s) atrasada(s)</span>}
        </div>
        <div className="mt-6"><div className="h-2.5 w-full overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, s.pctPaid * 100)}%` }} /></div>
          <p className="mt-2 flex justify-between text-xs text-white/75"><span>Pagado {cop(s.paidPrincipal)}</span><span>Monto del crédito {cop(terms.principal)}</span></p></div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard info={EXPLAIN.loanNextInstallment} title="Próxima cuota" value={s.next ? cop(s.next.payment + s.next.fees) : "—"} hint={s.next ? `${fmtDate(s.next.date)} · cuota ${s.next.n}${s.overdue ? " (atrasada)" : ""}${s.fees ? ` · incluye ${cop(s.fees)} de seguro/manejo` : ""}` : "Sin cuotas pendientes"} tone={s.overdue ? "negative" : undefined} icon={<CalendarClock size={16} />} />
        <KpiCard info={EXPLAIN.loanInterestPaid} title="Intereses pagados" value={cop(s.paidInterest)} hint={`de ${cop(s.plannedInterest)} previstos en el plan`} icon={<Percent size={16} />} />
        <KpiCard info={EXPLAIN.loanPaidTotal} title="Pagado en total" value={cop(s.paidTotal)} hint={`${payments.length} pago(s)${s.paidFees ? ` · seguro y manejo ${cop(s.paidFees)}` : ""}`} icon={<PiggyBank size={16} />} />
        <KpiCard info={EXPLAIN.loanEnd} title="Termina aprox." value={s.payoffDate ? fmtDate(s.payoffDate) + " " + s.payoffDate.getUTCFullYear() : paidOff ? "Saldado" : "—"} hint={s.monthsLeft === null ? (paidOff ? undefined : "La cuota no cubre los intereses") : `${s.monthsLeft} mes(es) · intereses restantes ≈ ${cop(s.interestLeft ?? 0)}${s.feesLeft ? ` · seguro/manejo ≈ ${cop(s.feesLeft)}` : ""}`} icon={<Landmark size={16} />} />
      </div>

      <section className="card space-y-4" aria-label="Plan de pagos">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-medium">Plan de pagos <InfoTip {...EXPLAIN.amortization} /></h2><p className="text-sm text-muted">Cuota mensual {cop(s.cuota)}{loan.monthlyPayment ? " (informada por el banco)" : " (calculada)"}{s.fees > 0 && <> + seguro/manejo {cop(s.fees)} = <strong>{cop(s.cuotaTotal)}</strong></>}</p></div>
        <AmortizationChart rows={s.plan} paidCount={Math.min(s.installmentsPaid, s.plan.length)} />
        <div className="flex justify-end"><FormDialog label="Ver tabla de amortización" icon="table" tone="default" title="Tabla de amortización" wide>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full"><thead><tr><th className="th">#</th><th className="th">Fecha</th><th className="th text-right">Cuota</th><th className="th text-right">Intereses</th><th className="th text-right">Capital</th>{s.fees > 0 && <th className="th text-right">Seguro/manejo</th>}<th className="th text-right">Saldo</th></tr></thead>
              <tbody className="divide-y divide-line">{s.plan.map((r, i) => (
                <tr key={r.n} className={i < s.installmentsPaid ? "bg-canvas/60" : ""}><td className="td">{r.n}</td><td className="td">{fmtDate(r.date)} {r.date.getUTCFullYear()}</td><td className="td text-right">{cop(r.payment + r.fees)}</td><td className="td text-right">{cop(r.interest)}</td><td className="td text-right">{cop(r.principal)}</td>{s.fees > 0 && <td className="td text-right">{cop(r.fees)}</td>}<td className="td text-right">{cop(r.balance)}</td></tr>
              ))}</tbody></table>
          </div>
        </FormDialog></div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <FolderCard className="min-w-0" tab="Pagos" meta={<>{payments.length} registrado(s)</>}>
          {s.rows.length === 0 && <p className="text-sm text-muted">Aún no has registrado pagos.</p>}
          <ul className="space-y-2">
            {[...s.rows].reverse().map((p) => (
              <li key={p.id} className="rounded-2xl inset px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{fmtDate(p.date)} {p.date.getUTCFullYear()} · {cop(p.amount)} <Chip tone={p.kind === "EXTRA" ? "brand" : "neutral"}>{p.kind === "EXTRA" ? "Abono extra" : "Cuota"}</Chip></span>
                  {canEdit && p.id && <IconAction action={deletePaymentAction} fields={{ workspaceId, paymentId: p.id }} icon="delete" tone="danger" label="Quitar" confirm="¿Quitar este pago?" />}
                </div>
                <p className="mt-1 text-muted">Capital {cop(p.principal)} · Intereses {cop(p.interest)}{p.fees > 0 && <> · Seguro/manejo {cop(p.fees)}</>} · Saldo después {cop(p.balanceAfter)}</p>
              </li>
            ))}
          </ul>
          {canEdit && (
            <ActionForm action={addPaymentAction} submitLabel="Registrar pago" className="mt-5 space-y-3 border-t border-line pt-4">
              <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="loanId" value={loan.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label" htmlFor="pdate">Fecha</label><input id="pdate" name="date" type="date" required defaultValue={inputDate(todayUtc())} className="input" /></div>
                <div><label className="label" htmlFor="pkind">Tipo</label><select id="pkind" name="kind" className="input"><option value="INSTALLMENT">Cuota</option><option value="EXTRA">Abono extra a capital</option></select></div>
                <div><label className="label" htmlFor="pamount">Valor pagado</label><input id="pamount" name="amount" type="number" max="1000000000000" min="0.01" step="0.01" required className="input" defaultValue={Math.round(s.cuotaTotal)} /></div>
                <div><label className="label" htmlFor="pint">Intereses del extracto (opcional)</label><input id="pint" name="interestOverride" type="number" max="1000000000000" min="0" step="0.01" className="input" placeholder="Si no, se calculan" /></div>
                <div className="sm:col-span-2"><label className="label" htmlFor="pfees">Seguro y cuota de manejo incluidos en el pago</label><input id="pfees" name="fees" type="number" max="1000000000000" min="0" step="0.01" className="input" defaultValue={s.fees > 0 ? Math.round(s.fees) : undefined} placeholder="0 si el pago no los incluye" /><p className="mt-1 text-xs text-muted">Se restan del pago antes de calcular intereses y capital. En un abono extra a capital se ignoran.</p></div>
              </div>
            </ActionForm>
          )}
        </FolderCard>

        <FolderCard className="min-w-0" tab="Destino del crédito" meta={<>{cop(allocTotal)}</>}>
          {allocations.length === 0 && <p className="text-sm text-muted">Registra a dónde fue el dinero (inversión, tarjetas, ahorro…). También puedes pegarlo desde Excel en «Carga en lote».</p>}
          <ul className="space-y-3">
            {allocations.map((a) => (
              <li key={a.id} className="text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0"><span className="block truncate font-medium">{a.name}</span>{a.category && <span className="block text-xs text-muted">{a.category}</span>}</span>
                  <span className="shrink-0 text-right"><span className="block font-medium">{cop(num(a.amount))}</span><span className="text-xs text-muted">{pct(terms.principal ? num(a.amount) / terms.principal : 0)} del crédito</span></span>
                </div>
                <div className="mt-1.5"><ProgressBar value={terms.principal ? num(a.amount) / terms.principal : 0} label={a.name} /></div>
                {canEdit && <div className="mt-1"><IconAction action={deleteAllocationAction} fields={{ workspaceId, allocationId: a.id }} icon="delete" tone="danger" label="Quitar" confirm="¿Quitar este destino?" /></div>}
              </li>
            ))}
          </ul>
          {allocations.length > 0 && (
            <p className={`mt-4 text-sm ${allocTotal > terms.principal + 1 ? "text-negative" : "text-muted"}`}>
              {allocTotal > terms.principal + 1 ? `La suma de destinos supera el crédito en ${cop(allocTotal - terms.principal)}: revisa si algún concepto está repetido.` : `Sin asignar: ${cop(terms.principal - allocTotal)}`}
            </p>
          )}
          {canEdit && (
            <ActionForm action={addAllocationAction} submitLabel="Agregar destino" className="mt-5 space-y-3 border-t border-line pt-4">
              <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="loanId" value={loan.id} />
              <div className="grid gap-3 sm:grid-cols-3">
                <div><label className="label" htmlFor="acat">Categoría</label><input id="acat" name="category" className="input" placeholder="Airbnb" /></div>
                <div><label className="label" htmlFor="aname">Concepto</label><input id="aname" name="name" required className="input" placeholder="Total inversión Airbnb" /></div>
                <div><label className="label" htmlFor="aamount">Valor</label><input id="aamount" name="amount" type="number" max="1000000000000" min="0" step="0.01" required className="input" /></div>
              </div>
            </ActionForm>
          )}
        </FolderCard>
      </div>

      {canEdit && (
        <section className="card space-y-4">
          <div className="flex items-center gap-2">
            <FormDialog label="Editar los datos del crédito" icon="edit" tone="default" title="Editar los datos del crédito" wide>
            <ActionForm action={updateLoanAction} submitLabel="Guardar cambios" className="space-y-4" resetOnSuccess={false}>
              <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="loanId" value={loan.id} /><LoanFields loan={loan} />
            </ActionForm>
            </FormDialog>
            <FormDialog label="Agregar otro crédito" title="Agregar otro crédito" wide><ActionForm action={createLoanAction} submitLabel="Crear crédito"><input type="hidden" name="workspaceId" value={workspaceId} /><LoanFields /></ActionForm></FormDialog>
            <IconAction action={deleteLoanAction} icon="delete" label="Eliminar este crédito" tone="danger" confirm="¿Eliminar el crédito con sus pagos y destinos? No se puede deshacer." fields={{ workspaceId, loanId: loan.id }} />
          </div>
        </section>
      )}
    </>
  );
}
