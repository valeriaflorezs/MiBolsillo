import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { DeleteButton } from "@/components/forms/delete-button";
import { ReceiptLink } from "@/components/forms/receipt-link";
import { Chip } from "@/components/ui/chip";
import { FolderCard } from "@/components/ui/folder-card";
import { MonthNav } from "@/components/ui/filters";
import { can, pageCtx } from "@/lib/auth/permissions";
import { canMutateTx } from "@/lib/auth/rbac";
import { cop, fmtDate, monthRange, txTitle, txVendorHint } from "@/lib/format";
import { deleteTransactionAction } from "@/modules/core/crud-actions";
import { markPaidAction } from "@/modules/core/finance-actions";
import { accountOptions, categoryOptions, getTransactionDetail, searchTransactions } from "@/modules/core/queries";
import { InfoTip } from "@/components/ui/info-tip";
import { EXPLAIN } from "@/lib/explain";

export const metadata = { title: "Movimientos" };
type SP = { month?: string; status?: string; q?: string; cat?: string; acc?: string; type?: string; page?: string; sel?: string; vista?: string };
const TYPE = { INCOME: "Ingreso", EXPENSE: "Gasto", TRANSFER: "Transferencia" } as const;

export default async function Transactions({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<SP> }) {
  const { workspaceId } = await params;
  const sp = await searchParams;
  const ctx = await pageCtx(workspaceId, "data:read");
  const admin = can(ctx.role, "finance:read");
  const canWrite = can(ctx.role, "transaction:create");
  const { key, start, end } = monthRange(sp.month);
  const table = sp.vista === "tabla";
  const status = sp.status === "PENDING" ? "PENDING" : sp.status === "PAID" ? "PAID" : undefined;
  const type = sp.type === "INCOME" || sp.type === "EXPENSE" || sp.type === "TRANSFER" ? sp.type : undefined;
  const filter = { workspaceId, role: ctx.role, userId: ctx.userId, start, end, status, type, q: sp.q?.trim() || undefined, categoryId: sp.cat || undefined, accountId: sp.acc || undefined, page: Number(sp.page) || 1, pageSize: table ? 50 : 20 } as const;
  const [data, cats, accs] = await Promise.all([searchTransactions(filter), categoryOptions(workspaceId), accountOptions(workspaceId)]);
  const selId = sp.sel ?? (table ? undefined : data.rows[0]?.id); // en escritorio se muestra el primer movimiento por defecto
  const selected = selId ? await getTransactionDetail(workspaceId, selId, ctx.role, ctx.userId) : null;
  const base = `/w/${workspaceId}/transactions`;
  const qs = (o: Partial<SP>) => { const p = new URLSearchParams(Object.entries({ ...sp, ...o }).filter(([, v]) => v) as [string, string][]); return `${base}?${p}`; };
  const exportHref = `${base}/export?${new URLSearchParams(Object.entries({ month: key, status: sp.status, q: sp.q, cat: sp.cat, acc: sp.acc, type: sp.type }).filter(([, v]) => v) as [string, string][])}`;
  const mutable = selected ? canMutateTx(ctx.role, { createdById: selected.createdById, type: selected.type, createdAt: selected.createdAt }, ctx.userId) : false;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Movimientos</h1>
        <div className="flex gap-2">
          <a href={exportHref} className="btn btn-ghost">Exportar CSV</a>
          {canWrite && <Link href={`/w/${workspaceId}/expenses/new`} className="btn btn-primary">+ Nuevo</Link>}
        </div>
      </div>

      <form className="card grid grid-cols-2 gap-3 lg:grid-cols-6" role="search" aria-label="Filtrar movimientos">
        <input type="hidden" name="month" value={key} />
        {table && <input type="hidden" name="vista" value="tabla" />}
        <div className="col-span-2"><label className="label" htmlFor="q">Buscar</label><input id="q" name="q" defaultValue={sp.q} placeholder="Proveedor o nota" className="input" /></div>
        <div><label className="label" htmlFor="cat">Categoría</label><select id="cat" name="cat" defaultValue={sp.cat ?? ""} className="input"><option value="">Todas</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select></div>
        {admin && <div><label className="label" htmlFor="acc">Cuenta</label><select id="acc" name="acc" defaultValue={sp.acc ?? ""} className="input"><option value="">Todas</option>{accs.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}
        <div><label className="label" htmlFor="status">Estado</label><select id="status" name="status" defaultValue={sp.status ?? ""} className="input"><option value="">Todos</option><option value="PAID">Pagado / cobrado</option><option value="PENDING">Por pagar / cobrar</option></select></div>
        {admin && <div><label className="label" htmlFor="type">Tipo</label><select id="type" name="type" defaultValue={sp.type ?? ""} className="input"><option value="">Todos</option><option value="EXPENSE">Gastos</option><option value="INCOME">Ingresos</option><option value="TRANSFER">Transferencias</option></select></div>}
        <div className="col-span-2 flex items-end lg:col-span-1"><button className="btn btn-dark w-full">Filtrar</button></div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNav base={base} month={key} extra={Object.entries({ status: sp.status, q: sp.q, cat: sp.cat, acc: sp.acc, type: sp.type, vista: sp.vista }).filter(([, v]) => v).map(([k, v]) => `&${k}=${encodeURIComponent(v as string)}`).join("")} />
        <p className="text-sm text-muted">{data.total} movimiento(s) <InfoTip {...EXPLAIN.txTotals} />{admin && <> · Ingresos <strong className="text-ink">{cop(data.income)}</strong> · Gastos <strong className="text-ink">{cop(data.expense)}</strong></>}</p>
      </div>

      <div role="tablist" aria-label="Vista de movimientos" className="flex w-fit gap-1 rounded-pill border border-line p-1 text-sm">
        <Link role="tab" aria-selected={!table} href={qs({ vista: "", sel: "", page: "" })} className={`rounded-pill px-4 py-1.5 ${!table ? "bg-brand on-brand" : "text-muted hover:text-ink"}`}>Lista</Link>
        <Link role="tab" aria-selected={table} href={qs({ vista: "tabla", sel: "", page: "" })} className={`rounded-pill px-4 py-1.5 ${table ? "bg-brand on-brand" : "text-muted hover:text-ink"}`}>Tabla</Link>
      </div>

      {table ? (
        <section className="card overflow-x-auto !p-2" aria-label="Tabla de movimientos">
          {data.rows.length === 0 ? <p className="p-6 text-center text-muted">Sin movimientos con estos filtros.</p> : (
            <table className="w-full">
              <thead><tr><th className="th">Fecha</th><th className="th">Tipo</th><th className="th">Descripción</th><th className="th">Categoría</th><th className="th">Proveedor</th><th className="th">Cuenta</th><th className="th">Estado</th><th className="th text-right">Monto</th></tr></thead>
              <tbody className="divide-y divide-line">
                {data.rows.map((t) => (
                  <tr key={t.id}>
                    <td className="td whitespace-nowrap">{fmtDate(t.date)}</td>
                    <td className="td">{TYPE[t.type]}</td>
                    <td className="td"><Link href={qs({ vista: "", sel: t.id })} className="font-medium underline-offset-2 hover:underline">{t.description?.trim() || t.vendor || t.category?.name || TYPE[t.type]}</Link> {t.hasReceipt && <span aria-label="Con comprobante">📎</span>}{t.quantity != null && <span className="text-xs text-muted"> · {t.quantity} u</span>}</td>
                    <td className="td">{t.category ? `${t.category.emoji ?? ""} ${t.category.name}` : "—"}</td>
                    <td className="td">{t.vendor ?? "—"}</td>
                    <td className="td">{t.account}</td>
                    <td className="td">{t.status === "PAID" ? "Pagado" : <Chip tone="negative">Pendiente</Chip>}</td>
                    <td className={`td whitespace-nowrap text-right font-medium ${t.type === "INCOME" ? "text-positive" : ""}`}>{t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "−" : "↔"} {cop(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data.pages > 1 && (
            <nav aria-label="Paginación" className="flex items-center justify-between px-3 py-3 text-sm">
              {data.page > 1 ? <Link href={qs({ page: String(data.page - 1) })} className="underline">‹ Anterior</Link> : <span />}
              <span className="text-muted">Página {data.page} de {data.pages}</span>
              {data.page < data.pages ? <Link href={qs({ page: String(data.page + 1) })} className="underline">Siguiente ›</Link> : <span />}
            </nav>
          )}
        </section>
      ) : (
      <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
        <section className="panel space-y-2 !p-3 sm:!p-4" aria-label="Lista de movimientos">
          {data.rows.length === 0 && <p className="p-6 text-center text-white/70">Sin movimientos con estos filtros.</p>}
          <ul className="space-y-1.5">
            {data.rows.map((t) => (
              <li key={t.id}>
                <Link href={qs({ sel: t.id })} aria-current={selId === t.id ? "true" : undefined} className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors ${selId === t.id ? "bg-brand on-brand shadow-glow" : "border border-white/10 bg-white/10 hover:bg-white/20"}`}>
                  <span className="flex min-w-0 items-center gap-3"><span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15">{t.category?.emoji ?? "💳"}</span>
                    <span className="min-w-0"><span className="block truncate font-medium">{txTitle(t, TYPE[t.type], t.category?.name)} {t.hasReceipt && <span aria-label="Con comprobante">📎</span>}</span><span className="block text-xs text-white/60">{txVendorHint(t) ? `${txVendorHint(t)} · ` : ""}{fmtDate(t.date)} · {t.account}{t.status === "PENDING" ? " · Pendiente" : ""}</span></span></span>
                  <span className={`shrink-0 font-medium ${t.type === "INCOME" ? "text-accent" : ""}`}>{t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "−" : "↔"} {cop(t.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {data.pages > 1 && (
            <nav aria-label="Paginación" className="flex items-center justify-between px-1 pt-2 text-sm">
              {data.page > 1 ? <Link href={qs({ page: String(data.page - 1) })} className="underline">‹ Anterior</Link> : <span />}
              <span className="text-white/70">Página {data.page} de {data.pages}</span>
              {data.page < data.pages ? <Link href={qs({ page: String(data.page + 1) })} className="underline">Siguiente ›</Link> : <span />}
            </nav>
          )}
        </section>

        <FolderCard className="min-h-64" tab={selected ? TYPE[selected.type] : "Detalle"} meta={selected ? <>{fmtDate(selected.date)} · {selected.status === "PAID" ? "Pagado" : "Por pagar"}</> : undefined}>
          {!selected ? <p className="py-12 text-center text-muted">Selecciona un movimiento para ver su detalle.</p> : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2"><Chip tone="brand">{TYPE[selected.type]}</Chip><Chip tone={selected.status === "PAID" ? "positive" : "negative"}>{selected.status === "PAID" ? "Pagado" : "Por pagar"}</Chip></div>
                  <p className="mt-3 text-4xl font-semibold tracking-tight">{cop(selected.amount)}</p>
                  <p className="mt-1 text-muted">{txTitle(selected, "Sin descripción", selected.category?.name)}</p>
                </div>
                <span aria-hidden className="grid size-14 place-items-center rounded-2xl inset-strong text-2xl">{selected.category?.emoji ?? "💳"}</span>
              </div>
              <dl className="grid gap-3 rounded-2xl inset p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-muted">Fecha</dt><dd className="font-medium">{fmtDate(selected.date)}</dd></div>
                {selected.vendor && <div><dt className="text-muted">Proveedor</dt><dd className="font-medium">{selected.vendor}</dd></div>}
                <div><dt className="text-muted">Categoría</dt><dd className="font-medium">{selected.category ? `${selected.category.emoji ?? ""} ${selected.category.name}` : "—"}</dd></div>
                <div><dt className="text-muted">Cuenta</dt><dd className="font-medium">{selected.account}{selected.transferAccount ? ` → ${selected.transferAccount}` : ""}</dd></div>
                <div><dt className="text-muted">Registrado por</dt><dd className="font-medium">{selected.createdBy}</dd></div>
                {selected.quantity != null && <div><dt className="flex items-center gap-1.5 text-muted">Cantidad <InfoTip {...EXPLAIN.unitValue} /></dt><dd className="font-medium">{selected.quantity} · {cop(selected.amount / selected.quantity)} c/u</dd></div>}
                {selected.property && <div><dt className="text-muted">Propiedad</dt><dd className="font-medium">{selected.property}</dd></div>}
                {selected.description && <div className="sm:col-span-2"><dt className="text-muted">Nota</dt><dd className="font-medium">{selected.description}</dd></div>}
              </dl>
              {selected.attachments.map((a) => <ReceiptLink key={a.id} workspaceId={workspaceId} attachmentId={a.id} name={a.fileName ?? "Ver comprobante"} />)}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {canWrite && selected.status === "PENDING" && (
                  <ActionForm action={markPaidAction} submitLabel="Marcar como pagado" className="flex"><input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="transactionId" value={selected.id} /></ActionForm>
                )}
                {mutable && <Link href={`${base}/${selected.id}/edit`} className="btn btn-ghost">Editar</Link>}
                {mutable && <DeleteButton action={deleteTransactionAction} fields={{ workspaceId, transactionId: selected.id }} confirmText="¿Eliminar este movimiento y su comprobante?" />}
              </div>
              {!mutable && canWrite && <p className="text-xs text-muted">Solo el administrador puede modificar este movimiento.</p>}
              {!canWrite && <p className="text-xs text-muted">Tu acceso es de solo lectura.</p>}
            </div>
          )}
        </FolderCard>
      </div>
      )}
    </>
  );
}
