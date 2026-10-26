import Link from "next/link";
import { KpiCard } from "@/components/ui/kpi-card";
import { can, pageCtx } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { cardSummary } from "@/lib/finance/card";
import { applyPayments } from "@/lib/finance/loan";
import { cop, num } from "@/lib/format";
import { accountBalances, possibleDuplicates } from "@/modules/core/queries";
import { AccountsPanel } from "./accounts-panel";
import { CardsPanel } from "./cards-panel";
import { LoansPanel } from "./loans-panel";
import { EXPLAIN } from "@/lib/explain";

export const metadata = { title: "Cuentas y deudas" };
const TABS = [{ id: "cuentas", label: "Cuentas" }, { id: "tarjetas", label: "Tarjetas de crédito" }, { id: "creditos", label: "Créditos" }] as const;
type Tab = (typeof TABS)[number]["id"];

export default async function AccountsAndDebt({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ t?: string; l?: string }> }) {
  const { workspaceId } = await params;
  const sp = await searchParams;
  const ctx = await pageCtx(workspaceId, "finance:read");
  const canEdit = can(ctx.role, "dashboard:full");
  const tab: Tab = TABS.some((t) => t.id === sp.t) ? (sp.t as Tab) : "cuentas";

  const [accounts, loans] = await Promise.all([
    accountBalances(workspaceId, true),
    prisma.loan.findMany({ where: { workspaceId }, include: { payments: true } }),
  ]);
  const live = accounts.filter((a) => !a.archived);
  const money = live.filter((a) => a.type !== "CREDIT_CARD").reduce((s, a) => s + a.balance, 0);
  const cardDebt = live.filter((a) => a.type === "CREDIT_CARD").reduce((s, a) => s + cardSummary({}, a.balance, new Date()).debt, 0);
  const loanDebt = loans.reduce((s, l) => s + applyPayments(
    { principal: num(l.principal), rateType: l.rateType, ratePct: num(l.ratePct), termMonths: l.termMonths, firstPaymentDate: l.firstPaymentDate },
    l.payments.map((p) => ({ date: p.date, kind: p.kind, amount: num(p.amount), interestOverride: p.interestOverride ? num(p.interestOverride) : null, fees: p.fees ? num(p.fees) : null })),
  ).balance, 0);
  const net = money - cardDebt - loanDebt;
  const base = `/w/${workspaceId}/accounts`;

  return (
    <>
      <div><h1 className="text-3xl font-semibold tracking-tight">Cuentas y deudas</h1><p className="text-muted">Tu dinero, tus tarjetas y tus créditos en un solo lugar.</p></div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard info={EXPLAIN.moneyInAccounts} title="Dinero en cuentas" value={cop(money)} hint="Efectivo, bancos y billeteras" />
        <KpiCard info={EXPLAIN.cardDebtTotal} title="Deuda en tarjetas" value={cop(cardDebt)} tone={cardDebt > 0 ? "negative" : undefined} hint="Lo que debes en tarjetas de crédito" />
        <KpiCard info={EXPLAIN.loansBalance} title="Saldo de créditos" value={cop(loanDebt)} tone={loanDebt > 0 ? "negative" : undefined} hint={`${loans.length} crédito(s) con el banco`} />
        <KpiCard info={EXPLAIN.netPosition} title="Posición neta" value={cop(net)} tone={net < 0 ? "negative" : "positive"} hint="Dinero menos deudas" />
      </div>

      <nav aria-label="Secciones" className="flex flex-wrap gap-2">
        {TABS.map((t) => <Link key={t.id} href={`${base}?t=${t.id}`} aria-current={t.id === tab ? "page" : undefined} className={t.id === tab ? "btn btn-primary" : "btn btn-ghost"}>{t.label}</Link>)}
      </nav>

      {tab === "cuentas" && <AccountsPanel workspaceId={workspaceId} accounts={accounts} canEdit={canEdit} duplicates={tab === "cuentas" ? await possibleDuplicates(workspaceId) : []} />}
      {tab === "tarjetas" && <CardsPanel workspaceId={workspaceId} accounts={accounts} canEdit={canEdit} />}
      {tab === "creditos" && <LoansPanel workspaceId={workspaceId} loanId={sp.l} canEdit={canEdit} />}
    </>
  );
}
