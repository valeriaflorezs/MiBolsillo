import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { Filters } from "@/components/ui/filters";
import { pageCtx } from "@/lib/auth/permissions";
import { cop, fmtDate, monthRange } from "@/lib/format";
import { markPaidAction } from "@/modules/core/finance-actions";
import { listTransactions } from "@/modules/core/queries";

export const metadata = { title: "Gastos" };

export default async function Transactions({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ month?: string; status?: string }> }) {
  const { workspaceId } = await params;
  const sp = await searchParams;
  const ctx = await pageCtx(workspaceId, "transaction:create");
  const { key, start, end } = monthRange(sp.month);
  const status = sp.status === "PENDING" ? "PENDING" : sp.status === "PAID" ? "PAID" : undefined;
  const rows = await listTransactions({ workspaceId, role: ctx.role, userId: ctx.userId, start, end, status });
  const sign = (t: { type: string }) => (t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "−" : "↔");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Movimientos</h1>
        <Link href={`/w/${workspaceId}/expenses/new`} className="btn btn-primary">+ Nuevo</Link>
      </div>
      <Filters base={`/w/${workspaceId}/transactions`} month={key} status={sp.status ?? "ALL"} />
      <section className="card overflow-x-auto !p-2">
        {rows.length === 0 ? <p className="p-6 text-center text-muted">Sin movimientos en este filtro.</p> : (
          <table className="w-full">
            <thead><tr><th className="th">Fecha</th><th className="th">Detalle</th><th className="th">Categoría</th><th className="th">Cuenta</th><th className="th text-right">Monto</th><th className="th"><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="td whitespace-nowrap">{fmtDate(t.date)}</td>
                  <td className="td">{t.vendor ?? t.description ?? "—"} {t.hasReceipt && <span title="Con comprobante" aria-label="Con comprobante">📎</span>}{t.status === "PENDING" && <span className="ml-2 rounded-pill bg-canvas px-2 py-0.5 text-xs">Por pagar</span>}</td>
                  <td className="td">{t.category ? `${t.category.emoji ?? ""} ${t.category.name}` : "—"}</td>
                  <td className="td">{t.account}</td>
                  <td className={`td whitespace-nowrap text-right font-medium ${t.type === "INCOME" ? "text-positive" : ""}`}>{sign(t)} {cop(t.amount)}</td>
                  <td className="td">
                    {t.status === "PENDING" && (
                      <ActionForm action={markPaidAction} submitLabel="Pagado" variant="ghost" className="flex">
                        <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="transactionId" value={t.id} />
                      </ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
