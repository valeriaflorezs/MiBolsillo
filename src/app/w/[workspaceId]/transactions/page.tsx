import Link from "next/link";
import { prisma } from "@/lib/db";
import { IconButton } from "@/components/ui/icon-button";
import { CategoryIcon, Icon } from "@/components/ui/icons";
import { ActionForm } from "@/components/forms/action-form";
import { IconAction } from "@/components/forms/icon-action";
import { ReceiptLink } from "@/components/forms/receipt-link";
import { TxBulkTable } from "@/components/forms/tx-bulk-table";
import { Chip } from "@/components/ui/chip";
import { FolderCard } from "@/components/ui/folder-card";
import { FilterBar, FilterSearch, FilterSelect, MonthNav } from "@/components/ui/filters";
import { can, pageCtx } from "@/lib/auth/permissions";
import { canMutateTx } from "@/lib/auth/rbac";
import { cop, fmtDate, monthRange, txTitle, txVendorHint } from "@/lib/format";
import { deleteTransactionAction } from "@/modules/core/crud-actions";
import { markPaidAction } from "@/modules/core/finance-actions";
import { accountOptions, categoryOptions, getTransactionDetail, searchTransactions } from "@/modules/core/queries";
import { InfoTip } from "@/components/ui/info-tip";
import { EXPLAIN } from "@/lib/explain";

export const metadata = { title: "Movimientos" };
type SP = { month?: string; status?: string; q?: string; cat?: string; acc?: string; prop?: string; type?: string; page?: string; sel?: string; vista?: string };
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
  const filter = { workspaceId, role: ctx.role, userId: ctx.userId, start, end, status, type, q: sp.q?.trim() || undefined, categoryId: sp.cat || undefined, accountId: sp.acc || undefined, propertyId: sp.prop || undefined, page: Number(sp.page) || 1, pageSize: table ? 50 : 20 } as const;
  const [data, cats, accs, props] = await Promise.all([searchTransactions(filter), categoryOptions(workspaceId), accountOptions(workspaceId), prisma.property.findMany({ where: { workspaceId }, select: { id: true, name: true }, orderBy: { name: "asc" } })]);
  const selId = sp.sel ?? (table ? undefined : data.rows[0]?.id); // en escritorio se muestra el primer movimiento por defecto
  const selected = selId ? await getTransactionDetail(workspaceId, selId, ctx.role, ctx.userId) : null;
  const base = `/w/${workspaceId}/transactions`;
  const qs = (o: Partial<SP>) => { const p = new URLSearchParams(Object.entries({ ...sp, ...o }).filter(([, v]) => v) as [string, string][]); return `${base}?${p}`; };
  const exportHref = `${base}/export?${new URLSearchParams(Object.entries({ month: key, status: sp.status, q: sp.q, cat: sp.cat, acc: sp.acc, prop: sp.prop, type: sp.type }).filter(([, v]) => v) as [string, string][])}`;
  const mutable = selected ? canMutateTx(ctx.role, { createdById: selected.createdById, type: selected.type, createdAt: selected.createdAt }, ctx.userId) : false;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Movimientos</h1>
        <div className="flex gap-2">
          <IconButton href={exportHref} icon="download" label="Exportar CSV" />
          {canWrite && <IconButton href={`/w/${workspaceId}/expenses/new`} icon="add" label="Nuevo movimiento" tone="primary" />}
        </div>
      </div>

      <FilterBar action={base} hidden={{ month: key, vista: table ? "tabla" : undefined }} label="Filtrar movimientos"
        lead={<MonthNav base={base} month={key} extra={Object.entries({ status: sp.status, q: sp.q, cat: sp.cat, acc: sp.acc, prop: sp.prop, type: sp.type, vista: sp.vista }).filter(([, v]) => v).map(([k, v]) => `&${k}=${encodeURIComponent(v as string)}`).join("")} />}
        clearHref={sp.q || sp.cat || sp.acc || sp.prop || sp.status || sp.type ? `${base}?month=${key}${table ? "&vista=tabla" : ""}` : undefined}>
        <FilterSearch name="q" value={sp.q} placeholder="Buscar proveedor o nota" />
        <FilterSelect name="cat" label="Categoría" value={sp.cat} options={cats} all="Categoría: todas" none="Sin categoría" />
        {admin && <FilterSelect name="acc" label="Cuenta" value={sp.acc} options={accs} all="Cuenta: todas" />}
        {props.length > 1 && <FilterSelect name="prop" label="Propiedad" value={sp.prop} options={props} all="Propiedad: todas" none="Sin propiedad" />}
        <FilterSelect name="status" label="Estado" value={sp.status} options={[{ id: "PAID", name: "Pagado / cobrado" }, { id: "PENDING", name: "Por pagar / cobrar" }]} all="Estado: todos" />
        {admin && <FilterSelect name="type" label="Tipo" value={sp.type} options={[{ id: "EXPENSE", name: "Gastos" }, { id: "INCOME", name: "Ingresos" }, { id: "TRANSFER", name: "Transferencias" }]} all="Tipo: todos" />}
      </FilterBar>

      <p className="text-sm text-muted">{data.total} movimiento(s) <InfoTip {...EXPLAIN.txTotals} />{admin && <> · Ingresos <strong className="text-ink">{cop(data.income)}</strong> · Gastos <strong className="text-ink">{cop(data.expense)}</strong></>}</p>

      <div role="tablist" aria-label="Vista de movimientos" className="flex w-fit gap-1 rounded-pill border border-line p-1 text-sm">
        <Link role="tab" aria-selected={!table} href={qs({ vista: "", sel: "", page: "" })} className={`rounded-pill px-4 py-1.5 ${!table ? "bg-brand on-brand" : "text-muted hover:text-ink"}`}>Lista</Link>
        <Link role="tab" aria-selected={table} href={qs({ vista: "tabla", sel: "", page: "" })} className={`rounded-pill px-4 py-1.5 ${table ? "bg-brand on-brand" : "text-muted hover:text-ink"}`}>Tabla</Link>
      </div>

      {table ? (
        <section className="card overflow-x-auto !p-2" aria-label="Tabla de movimientos">
          {data.rows.length === 0 ? <p className="p-6 text-center text-muted">Sin movimientos con estos filtros.</p> : (
            <TxBulkTable workspaceId={workspaceId} canBulk={can(ctx.role, "dashboard:full")} cats={cats} props={props} accounts={accs}
              rows={data.rows.map((t) => ({ id: t.id, href: qs({ vista: "", sel: t.id }), date: fmtDate(t.date), typeLabel: TYPE[t.type], type: t.type, title: t.description?.trim() || t.vendor || t.category?.name || TYPE[t.type], quantity: t.quantity, hasReceipt: t.hasReceipt, categoryId: t.categoryId, propertyId: t.propertyId, vendor: t.vendor, account: t.account, status: t.status, amountLabel: cop(t.amount) }))} />
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
                  <span className="flex min-w-0 items-center gap-3"><span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15"><CategoryIcon value={t.category?.emoji} /></span>
                    <span className="min-w-0"><span className="block truncate font-medium">{txTitle(t, TYPE[t.type], t.category?.name)} {t.hasReceipt && <span aria-label="Con comprobante" className="inline-block align-middle"><Icon name="attach" size={14} /></span>}</span><span className="block text-xs text-white/60">{txVendorHint(t) ? `${txVendorHint(t)} · ` : ""}{fmtDate(t.date)} · {t.account}{t.status === "PENDING" ? " · Pendiente" : ""}</span></span></span>
                  <span className={`shrink-0 font-medium ${t.type === "INCOME" ? "text-accent" : ""}`}>{t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "−" : <Icon name="swap" size={16} className="inline align-text-bottom" />} {cop(t.amount)}</span>
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
                <span aria-hidden className="grid size-14 place-items-center rounded-2xl inset-strong text-2xl"><CategoryIcon value={selected.category?.emoji} size={28} /></span>
              </div>
              <dl className="grid gap-3 rounded-2xl inset p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-muted">Fecha</dt><dd className="font-medium">{fmtDate(selected.date)}</dd></div>
                {selected.vendor && <div><dt className="text-muted">Proveedor</dt><dd className="font-medium">{selected.vendor}</dd></div>}
                <div><dt className="text-muted">Categoría</dt><dd className="font-medium">{selected.category ? <span className="inline-flex items-center gap-1.5"><CategoryIcon value={selected.category.emoji} size={16} />{selected.category.name}</span> : "—"}</dd></div>
                {selected.property && <div><dt className="text-muted">Propiedad</dt><dd className="font-medium">{selected.property}</dd></div>}
                <div><dt className="text-muted">Cuenta</dt><dd className="font-medium">{selected.account}{selected.transferAccount ? ` a ${selected.transferAccount}` : ""}</dd></div>
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
                {mutable && <IconAction action={deleteTransactionAction} fields={{ workspaceId, transactionId: selected.id }} icon="delete" tone="danger" label="Eliminar" confirm="¿Eliminar este movimiento y su comprobante?" />}
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
