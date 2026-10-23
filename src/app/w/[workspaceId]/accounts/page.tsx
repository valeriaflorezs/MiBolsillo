import { ActionForm } from "@/components/forms/action-form";
import { pageCtx } from "@/lib/auth/permissions";
import { cop } from "@/lib/format";
import { createAccountAction } from "@/modules/core/finance-actions";
import { accountBalances } from "@/modules/core/queries";

export const metadata = { title: "Cuentas" };
const TYPE = { CASH: "Efectivo", BANK: "Banco", DIGITAL_WALLET: "Billetera digital", CREDIT_CARD: "Tarjeta de crédito", LOAN_FUND: "Fondo de préstamo" } as const;

export default async function Accounts({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  await pageCtx(workspaceId, "dashboard:full");
  const accounts = await accountBalances(workspaceId);
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Cuentas</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <section key={a.id} className="card">
            <p className="text-sm text-muted">{a.emoji} {TYPE[a.type]}</p>
            <h2 className="mt-1 font-medium">{a.name}</h2>
            <p className={`mt-2 text-2xl font-semibold ${a.balance < 0 ? "text-negative" : ""}`}>{cop(a.balance)}</p>
          </section>
        ))}
      </div>
      <section className="card max-w-xl space-y-4">
        <h2 className="font-medium">Nueva cuenta</h2>
        <ActionForm action={createAccountAction} submitLabel="Crear cuenta">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label" htmlFor="name">Nombre</label><input id="name" name="name" required className="input" placeholder="Nequi" /></div>
            <div><label className="label" htmlFor="type">Tipo</label>
              <select id="type" name="type" className="input">{Object.entries(TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="label" htmlFor="openingBalance">Saldo inicial</label><input id="openingBalance" name="openingBalance" type="number" step="any" defaultValue={0} className="input" /></div>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
