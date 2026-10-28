import { Wallet } from "lucide-react";
import { ActionForm } from "@/components/forms/action-form";
import { FormDialog } from "@/components/forms/form-dialog";
import { Chip } from "@/components/ui/chip";
import { cop, fmtDate } from "@/lib/format";
import { updateAccountAction } from "@/modules/core/crud-actions";
import { createAccountAction } from "@/modules/core/finance-actions";
import { reconcileAccountAction } from "@/modules/core/reconcile-actions";
import type { accountBalances, possibleDuplicates } from "@/modules/core/queries";
import Link from "next/link";
import { InfoTip } from "@/components/ui/info-tip";
import { EXPLAIN } from "@/lib/explain";

const TYPE = { CASH: "Efectivo", BANK: "Banco", DIGITAL_WALLET: "Billetera digital", LOAN_FUND: "Fondo de préstamo" } as const;
type Balances = Awaited<ReturnType<typeof accountBalances>>;
type Dups = Awaited<ReturnType<typeof possibleDuplicates>>;

/** Cuentas de dinero (efectivo, bancos, billeteras). Las tarjetas de crédito viven en su pestaña. */
export function AccountsPanel({ workspaceId, accounts, canEdit, duplicates }: { workspaceId: string; accounts: Balances; canEdit: boolean; duplicates: Dups }) {
  const list = accounts.filter((a) => a.type !== "CREDIT_CARD");
  return (
    <>
      {canEdit && (
        <div className="flex justify-end">
          <FormDialog label="Nueva cuenta" title="Nueva cuenta">
            <ActionForm action={createAccountAction} submitLabel="Crear cuenta">
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <div className="space-y-3">
                <div><label className="label" htmlFor="name">Nombre</label><input id="name" name="name" required className="input" placeholder="Nequi" /></div>
                <div><label className="label" htmlFor="type">Tipo</label><select id="type" name="type" className="input">{Object.entries(TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                <div><label className="label" htmlFor="openingBalance">Saldo inicial</label><input id="openingBalance" name="openingBalance" type="number" min="-1000000000000" max="1000000000000" step="0.01" defaultValue={0} className="input" /></div>
              </div>
            </ActionForm>
          </FormDialog>
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {list.length === 0 && <p className="card text-muted md:col-span-2 lg:col-span-3">Aún no hay cuentas.</p>}
        {list.map((a) => (
          <section key={a.id} className={a.archived ? "card opacity-60" : "panel"}>
            <div className="flex items-start justify-between"><p className={`flex items-center gap-2 text-sm ${a.archived ? "text-muted" : "text-white/70"}`}><Wallet size={14} aria-hidden />{TYPE[a.type as keyof typeof TYPE]}</p>{a.archived && <Chip>Archivada</Chip>}</div>
            <h2 className="mt-2 font-medium">{a.name}</h2>
            <p className={`mt-1 flex items-center gap-2 text-3xl font-semibold ${a.balance < 0 ? "text-red-300" : ""}`}>{cop(a.balance)} <InfoTip {...EXPLAIN.moneyInAccounts} title={`Saldo de ${a.name}`} lines={["Saldo inicial + ingresos pagados − gastos pagados + transferencias recibidas − transferencias enviadas.", "Abre «¿Cómo se calcula? · Conciliar» para ver cada parte y comparar con el banco."]} className="text-base font-normal" /></p>
            <div className="mt-4 flex items-center gap-2">
              <FormDialog label="¿Cómo se calcula? · Conciliar" icon="calculate" tone="default" title={`Saldo de ${a.name}`}>
                <dl className="space-y-1">
                  <div className="flex justify-between"><dt>Saldo inicial</dt><dd>{cop(a.openingBalance)}</dd></div>
                  <div className="flex justify-between"><dt>+ Ingresos pagados</dt><dd>{cop(a.income)}</dd></div>
                  <div className="flex justify-between"><dt>− Gastos pagados</dt><dd>{cop(a.expense)}</dd></div>
                  <div className="flex justify-between"><dt>+ Transferencias recibidas</dt><dd>{cop(a.transferIn)}</dd></div>
                  <div className="flex justify-between"><dt>− Transferencias enviadas</dt><dd>{cop(a.transferOut)}</dd></div>
                  <div className="flex justify-between border-t border-line pt-1 font-semibold"><dt>= Saldo en la app</dt><dd>{cop(a.balance)}</dd></div>
                </dl>
                {a.pendingCount > 0 && <p className="mt-2 text-xs text-muted">No cuentan {a.pendingCount} movimiento(s) pendientes por {cop(Math.abs(a.pendingNet))} {a.pendingNet < 0 ? "por pagar" : "por cobrar"}: solo mueven el saldo cuando los marcas como pagados.</p>}
                {canEdit && (
                  <ActionForm action={reconcileAccountAction} submitLabel="Ajustar al saldo real" className="mt-3 space-y-2 border-t border-line pt-3">
                    <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="accountId" value={a.id} />
                    <label className="label" htmlFor={`rb${a.id}`}>Saldo real hoy (lo que dice el banco)</label>
                    <input id={`rb${a.id}`} name="realBalance" type="number" step="0.01" min="-1000000000000" max="1000000000000" required className="input" />
                    <p className="text-xs text-muted">Se registra la diferencia como un «ajuste de saldo» (no cuenta como venta ni gasto del negocio).</p>
                  </ActionForm>
                )}
              </FormDialog>
              {canEdit && (
                <FormDialog label="Editar cuenta" icon="edit" tone="default" title={`Editar ${a.name}`}>
                  <ActionForm action={updateAccountAction} submitLabel="Guardar" resetOnSuccess={false} className="mt-3 space-y-3">
                    <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="accountId" value={a.id} />
                    <div><label className="label" htmlFor={`n${a.id}`}>Nombre</label><input id={`n${a.id}`} name="name" defaultValue={a.name} required className="input" /></div>
                    <div><label className="label" htmlFor={`t${a.id}`}>Tipo</label><select id={`t${a.id}`} name="type" defaultValue={a.type} className="input">{Object.entries(TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                    <div><label className="label" htmlFor={`o${a.id}`}>Saldo inicial</label><input id={`o${a.id}`} name="openingBalance" type="number" min="-1000000000000" max="1000000000000" step="0.01" defaultValue={a.openingBalance} className="input" /></div>
                    <label className="flex items-center gap-2"><input type="checkbox" name="archived" defaultChecked={a.archived} />Archivar (se oculta de los formularios)</label>
                  </ActionForm>
                </FormDialog>
              )}
            </div>
          </section>
        ))}
      </div>
      {duplicates.length > 0 && (
        <section className="card space-y-3" aria-label="Posibles movimientos repetidos">
          <div><h2 className="font-medium">Posibles movimientos repetidos</h2><p className="text-sm text-muted">Misma cuenta, tipo, monto y fecha. Revisa si alguno se cargó dos veces (por ejemplo, al subir el mismo Excel otra vez); si es así, elimínalo desde Movimientos.</p></div>
          <ul className="divide-y divide-line text-sm">
            {duplicates.map((d) => (
              <li key={`${d.accountId}${d.type}${d.amount}${d.date.toISOString()}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{fmtDate(d.date)} · {d.account} · {d.type === "INCOME" ? "Ingreso" : "Gasto"} <strong>{cop(d.amount)}</strong> × {d.count}</span>
                <Link className="underline" href={`/w/${workspaceId}/transactions?month=${d.date.toISOString().slice(0, 7)}&acc=${d.accountId}&status=ALL`}>Revisar</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
