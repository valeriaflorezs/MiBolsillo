"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Chip } from "@/components/ui/chip";
import { CategoryIcon, Icon } from "@/components/ui/icons";
import { bulkUpdateTransactionsAction } from "@/modules/core/crud-actions";

export type BulkRow = {
  id: string; href: string; date: string; typeLabel: string; type: "INCOME" | "EXPENSE" | "TRANSFER"; title: string; quantity: number | null; hasReceipt: boolean;
  categoryId: string | null; propertyId: string | null; vendor: string | null; account: string; status: "PAID" | "PENDING"; amountLabel: string;
};
type Opt = { id: string; name: string; emoji?: string | null };
type Patch = { categoryId?: string | null; propertyId?: string | null; status?: "PAID" | "PENDING"; account?: string };

/** Tabla con selección múltiple. El cambio se aplica al instante en pantalla y se guarda en segundo plano, sin recargar la página. */
export function TxBulkTable({ workspaceId, rows, cats, props, accounts, canBulk }: { workspaceId: string; rows: BulkRow[]; cats: Opt[]; props: Opt[]; accounts: Opt[]; canBulk: boolean }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [patches, setPatches] = useState<Record<string, Patch>>({});
  const [cat, setCat] = useState(""); const [prop, setProp] = useState(""); const [acc, setAcc] = useState(""); const [status, setStatus] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const propById = useMemo(() => new Map(props.map((p) => [p.id, p.name])), [props]);
  const showProp = props.length > 0;
  const all = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const apply = () => {
    const ids = [...sel];
    const fd = new FormData();
    fd.set("workspaceId", workspaceId);
    ids.forEach((i) => fd.append("ids", i));
    fd.set("categoryId", cat); fd.set("propertyId", prop); fd.set("accountId", acc); fd.set("status", status);
    const patch: Patch = {};
    if (cat) patch.categoryId = cat === "__none" ? null : cat;
    if (prop) patch.propertyId = prop === "__none" ? null : prop;
    if (status) patch.status = status as "PAID" | "PENDING";
    if (acc) patch.account = accounts.find((a) => a.id === acc)?.name;
    const before = patches;
    setPatches((p) => ({ ...p, ...Object.fromEntries(ids.map((i) => [i, { ...p[i], ...patch, ...(prop && rows.find((r) => r.id === i)?.type === "TRANSFER" ? { propertyId: undefined } : {}) }])) }));
    setMsg(null);
    start(async () => {
      const r = await bulkUpdateTransactionsAction(null, fd);
      if (r?.ok) { setMsg({ ok: true, text: r.message ?? "Listo" }); setSel(new Set()); setCat(""); setProp(""); setAcc(""); setStatus(""); }
      else { setPatches(before); setMsg({ ok: false, text: r?.error ?? "No se pudo guardar." }); }
    });
  };

  return (
    <>
      {canBulk && sel.size > 0 && (
        <div role="region" aria-label="Edición en lote" className="sticky top-2 z-10 mb-2 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-3 shadow-lg">
          <p className="text-sm font-medium">{sel.size} seleccionado(s)</p>
          <label className="text-xs text-muted">Propiedad<select value={prop} onChange={(e) => setProp(e.target.value)} className="input mt-1"><option value="">— sin cambio —</option>{props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}<option value="__none">General (sin propiedad)</option></select></label>
          <label className="text-xs text-muted">Categoría<select value={cat} onChange={(e) => setCat(e.target.value)} className="input mt-1"><option value="">— sin cambio —</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="__none">Sin categoría</option></select></label>
          <label className="text-xs text-muted">Cuenta<select value={acc} onChange={(e) => setAcc(e.target.value)} className="input mt-1"><option value="">— sin cambio —</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <label className="text-xs text-muted">Estado<select value={status} onChange={(e) => setStatus(e.target.value)} className="input mt-1"><option value="">— sin cambio —</option><option value="PAID">Pagado / cobrado</option><option value="PENDING">Pendiente</option></select></label>
          <button type="button" className="btn btn-primary" disabled={pending || !(cat || prop || acc || status)} onClick={apply}>{pending ? "Guardando…" : "Aplicar"}</button>
          <button type="button" className="btn btn-ghost" onClick={() => setSel(new Set())}>Cancelar</button>
        </div>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`px-3 pb-2 text-sm ${msg.ok ? "text-positive" : "text-negative"}`}>{msg.text}</p>}
      <table className="w-full">
        <thead><tr>
          {canBulk && <th className="th w-8"><input type="checkbox" aria-label="Seleccionar todos" checked={all} onChange={() => setSel(all ? new Set() : new Set(rows.map((r) => r.id)))} /></th>}
          <th className="th">Fecha</th><th className="th">Tipo</th><th className="th">Descripción</th><th className="th">Categoría</th><th className="th">Proveedor</th><th className="th">Cuenta</th>{showProp && <th className="th">Propiedad</th>}<th className="th">Estado</th><th className="th text-right">Monto</th>
        </tr></thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => {
            const p = patches[r.id] ?? {};
            const cid = "categoryId" in p ? p.categoryId : r.categoryId;
            const c = cid ? catById.get(cid) : undefined;
            const pid = "propertyId" in p ? p.propertyId : r.propertyId;
            const st = p.status ?? r.status;
            return (
              <tr key={r.id} className={sel.has(r.id) ? "bg-brand/10" : undefined}>
                {canBulk && <td className="td"><input type="checkbox" aria-label="Seleccionar movimiento" checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>}
                <td className="td whitespace-nowrap">{r.date}</td>
                <td className="td">{r.typeLabel}</td>
                <td className="td"><Link href={r.href} className="font-medium underline-offset-2 hover:underline">{r.title}</Link> {r.hasReceipt && <span aria-label="Con comprobante" className="inline-block align-middle"><Icon name="attach" size={14} /></span>}{r.quantity != null && <span className="text-xs text-muted"> · {r.quantity} u</span>}</td>
                <td className="td">{c ? <span className="inline-flex items-center gap-1.5"><CategoryIcon value={c.emoji} size={16} />{c.name}</span> : "—"}</td>
                <td className="td">{r.vendor ?? "—"}</td>
                <td className="td">{p.account ?? r.account}</td>
                {showProp && <td className="td">{pid ? propById.get(pid) ?? "—" : "—"}</td>}
                <td className="td">{st === "PAID" ? "Pagado" : <Chip tone="negative">Pendiente</Chip>}</td>
                <td className={`td whitespace-nowrap text-right font-medium ${r.type === "INCOME" ? "text-positive" : ""}`}>{r.type === "INCOME" ? "+" : r.type === "EXPENSE" ? "−" : <Icon name="swap" size={16} className="inline align-text-bottom" />} {r.amountLabel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
