import { Wallet } from "lucide-react";
import { ActionForm } from "@/components/forms/action-form";
import { Chip } from "@/components/ui/chip";
import { pageCtx } from "@/lib/auth/permissions";
import { cop } from "@/lib/format";
import { updateAccountAction } from "@/modules/core/crud-actions";
import { createAccountAction } from "@/modules/core/finance-actions";
import { accountBalances } from "@/modules/core/queries";

export const metadata = { title: "Cuentas" };
const TYPE = { CASH: "Efectivo", BANK: "Banco", DIGITAL_WALLET: "Billetera digital", CREDIT_CARD: "Tarjeta de crédito", LOAN_FUND: "Fondo de préstamo" } as const;

export default async function Accounts({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  await pageCtx(workspaceId, "dashboard:full");
  const accounts = await accountBalances(workspaceId, true);
  const total = accounts.filter((a) => !a.archived).reduce((s, a) => s + a.balance, 0);
  return (
    <>
      <div><h1 className="text-3xl font-semibold tracking-tight">Cuentas</h1><p className="text-muted">Saldo total: <strong className="text-ink">{cop(total)}</strong></p></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <section key={a.id} className={a.archived ? "card opacity-60" : "panel"}>
            <div className="flex items-start justify-between"><p className={`flex items-center gap-2 text-sm ${a.archived ? "text-muted" : "text-white/70"}`}><Wallet size={14} aria-hidden />{TYPE[a.type]}</p>{a.archived && <Chip>Archivada</Chip>}</div>
            <h2 className="mt-2 font-medium">{a.name}</h2>
            <p className={`mt-1 text-3xl font-semibold ${a.balance < 0 ? "text-red-300" : ""}`}>{cop(a.balance)}</p>
            <details className="mt-4 text-sm"><summary className="cursor-pointer underline">Editar</summary>
              <div className={a.archived ? "" : "mt-3 rounded-2xl bg-surface p-4 text-ink"}>
                <ActionForm action={updateAccountAction} submitLabel="Guardar" resetOnSuccess={false} className="mt-3 space-y-3">
                  <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="accountId" value={a.id} />
                  <div><label className="label" htmlFor={`n${a.id}`}>Nombre</label><input id={`n${a.id}`} name="name" defaultValue={a.name} required className="input" /></div>
                  <div><label className="label" htmlFor={`t${a.id}`}>Tipo</label><select id={`t${a.id}`} name="type" defaultValue={a.type} className="input">{Object.entries(TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                  <div><label className="label" htmlFor={`o${a.id}`}>Saldo inicial</label><input id={`o${a.id}`} name="openingBalance" type="number" step="any" defaultValue={a.openingBalance} className="input" /></div>
                  <label className="flex items-center gap-2"><input type="checkbox" name="archived" defaultChecked={a.archived} />Archivar (se oculta de los formularios)</label>
                </ActionForm>
              </div>
            </details>
          </section>
        ))}
      </div>
      <section className="card max-w-2xl space-y-4">
        <h2 className="font-medium">Nueva cuenta</h2>
        <ActionForm action={createAccountAction} submitLabel="Crear cuenta">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label" htmlFor="name">Nombre</label><input id="name" name="name" required className="input" placeholder="Nequi" /></div>
            <div><label className="label" htmlFor="type">Tipo</label><select id="type" name="type" className="input">{Object.entries(TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label" htmlFor="openingBalance">Saldo inicial</label><input id="openingBalance" name="openingBalance" type="number" step="any" defaultValue={0} className="input" /></div>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
