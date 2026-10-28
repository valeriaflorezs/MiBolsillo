"use client";

import { Icon } from "@/components/ui/icons";
import { SearchSelect } from "./search-select";
import { useActionState, useRef, useState } from "react";
import type { ActionState } from "@/lib/actions";
import { createReceiptUploadAction, processReceiptAction } from "@/modules/core/receipt-actions";

type Opt = { id: string; name: string; emoji?: string | null };
type Props = {
  workspaceId: string;
  isAdmin: boolean;
  accounts: Opt[];
  categories: Opt[];
  /** Propiedades del negocio: el gasto o ingreso puede ser de una en particular o general. */
  properties?: Opt[];
  /** Ítems de CAPEX pendientes de compra: al elegir uno, el gasto lo marca comprado (no se digita dos veces). */
  capexItems?: { id: string; name: string; detail?: string; total: number; categoryId: string | null }[];
  defaultType?: "EXPENSE" | "INCOME" | "TRANSFER";
  receipts: { upload: boolean; ocr: boolean };
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
};

const OK = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const today = () => new Date().toISOString().slice(0, 10);

export function ExpenseForm({ workspaceId, isAdmin, accounts, categories, properties = [], capexItems = [], defaultType = "EXPENSE", receipts, action }: Props) {
  const [attachmentId, setAttachmentId] = useState("");
  const [file, setFile] = useState("");
  const [ocr, setOcr] = useState<{ msg: string; kind: "info" | "error" | "ok" } | null>(null);
  const [drag, setDrag] = useState(false);
  const [vals, setVals] = useState({ vendor: "", date: today(), amount: "", categoryId: "", quantity: "", capexItemId: "" });
  const [type, setType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">(defaultType);
  const isExpense = type === "EXPENSE", isTransfer = type === "TRANSFER";
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await action(prev, fd);
    if (r?.ok) { // limpia el formulario para el siguiente gasto
      setAttachmentId(""); setFile(""); setOcr(null);
      setVals({ vendor: "", date: today(), amount: "", categoryId: "", quantity: "", capexItemId: "" });
      formRef.current?.reset();
    }
    return r;
  }, null);

  async function handleFile(f: File) {
    if (!receipts.upload) return;
    if (!OK.includes(f.type)) return setOcr({ msg: "Solo imágenes (JPG, PNG, WebP) o PDF.", kind: "error" });
    if (f.size > 8 * 1024 * 1024) return setOcr({ msg: "El archivo supera 8 MB.", kind: "error" });
    setFile(f.name);
    setOcr({ msg: "Subiendo comprobante…", kind: "info" });
    const up = await createReceiptUploadAction({ workspaceId, mimeType: f.type, sizeBytes: f.size, fileName: f.name });
    if (!up.ok) return setOcr({ msg: `${up.error} Puedes completar los datos a mano.`, kind: "error" });
    const put = await fetch(up.uploadUrl, { method: "PUT", body: f, headers: { "Content-Type": f.type } }).catch(() => null);
    if (!put?.ok) return setOcr({ msg: "No se pudo subir el archivo. Completa los datos a mano.", kind: "error" });
    setAttachmentId(up.attachmentId);
    setOcr({ msg: "Leyendo datos del comprobante…", kind: "info" });
    const res = await processReceiptAction({ workspaceId, attachmentId: up.attachmentId });
    if (!res.ok) return setOcr({ msg: res.error, kind: "error" });
    const d = res.data;
    setVals((v) => ({
      vendor: d.vendor ?? v.vendor,
      date: d.date ?? v.date,
      amount: d.total != null ? String(d.total) : v.amount,
      categoryId: d.categoryId ?? v.categoryId,
      quantity: v.quantity,
      capexItemId: v.capexItemId,
    }));
    setOcr({ msg: "Datos sugeridos: revísalos antes de guardar.", kind: "ok" });
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="attachmentId" value={attachmentId} />

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) void handleFile(f); }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${drag ? "border-brand bg-canvas" : "border-line"}`}
      >
        {receipts.upload ? (
          <>
            <p className="text-sm">Arrastra la factura aquí o</p>
            <label className="btn btn-ghost mt-2 cursor-pointer">
              Elegir archivo
              <input type="file" accept={OK.join(",")} capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
            </label>
            {!receipts.ocr && <p className="mt-2 text-xs text-muted">Se guarda el comprobante; la lectura automática de datos aún no está activada.</p>}
          </>
        ) : <p className="text-sm text-muted">Adjuntar facturas aún no está disponible (falta configurar el almacenamiento). Registra el gasto a mano.</p>}
        {file && <p className="mt-2 text-sm text-muted">{file}</p>}
        <p role="status" className={`mt-2 text-sm ${ocr?.kind === "error" ? "text-negative" : ocr?.kind === "ok" ? "text-positive" : "text-muted"}`}>{ocr?.msg}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {isAdmin && (
          <div>
            <label className="label" htmlFor="type">Tipo</label>
            <select id="type" name="type" className="input" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="EXPENSE">Gasto</option><option value="INCOME">Ingreso</option><option value="TRANSFER">Transferencia</option>
            </select>
          </div>
        )}
        <div>
          <label className="label" htmlFor="amount">Monto (COP)</label>
          <input id="amount" name="amount" type="number" max="1000000000000" inputMode="decimal" min="0.01" step="0.01" required className="input" value={vals.amount} onChange={(e) => setVals({ ...vals, amount: e.target.value })} />
        </div>
        {isExpense && (
          <div>
          <label className="label" htmlFor="quantity">Cantidad (opcional)</label>
          <input id="quantity" name="quantity" type="number" max="10000000" inputMode="decimal" min="0.001" step="0.001" className="input" placeholder="Unidades compradas" value={vals.quantity} onChange={(e) => setVals({ ...vals, quantity: e.target.value })} />
        </div>
        )}
        <div>
          <label className="label" htmlFor="date">Fecha</label>
          <input id="date" name="date" type="date" required className="input" value={vals.date} onChange={(e) => setVals({ ...vals, date: e.target.value })} />
        </div>
        {isExpense && (
          <div>
          <label className="label" htmlFor="vendor">Proveedor</label>
          <input id="vendor" name="vendor" maxLength={80} className="input" value={vals.vendor} onChange={(e) => setVals({ ...vals, vendor: e.target.value })} />
        </div>
        )}
        {!isTransfer && (
          <div>
          <label className="label" htmlFor="categoryId">Categoría</label>
          <select id="categoryId" name="categoryId" className="input" value={vals.categoryId} onChange={(e) => setVals({ ...vals, categoryId: e.target.value })}>
            <option value="">Sin categoría</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        )}
        {!isTransfer && properties.length > 0 && (
          <div>
            <label className="label" htmlFor="propertyId">Propiedad</label>
            <select id="propertyId" name="propertyId" className="input" defaultValue={properties.length === 1 ? properties[0].id : ""}>
              <option value="">General (sin propiedad)</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        {isExpense && capexItems.length > 0 && (
          <div className="sm:col-span-2">
            <label className="label" htmlFor="capexItemId">¿Es la compra de un ítem de CAPEX? <span className="font-normal text-muted">(opcional)</span></label>
            <SearchSelect id="capexItemId" name="capexItemId" value={vals.capexItemId} placeholder="No, es un gasto normal" emptyLabel="No, es un gasto normal" searchPlaceholder="Buscar ítem de CAPEX…"
              options={capexItems.map((c) => ({ id: c.id, label: c.name, detail: c.detail }))}
              onChange={(id) => { const it = capexItems.find((c) => c.id === id); setVals((v) => ({ ...v, capexItemId: id, amount: it && it.total && !v.amount ? String(it.total) : v.amount, categoryId: it?.categoryId ?? v.categoryId })); }} />
            <p className="mt-1 text-xs text-muted">Se marca como comprado en CAPEX con este monto y se clasifica como CAPEX: no tienes que registrarlo dos veces.</p>
          </div>
        )}
        <div>
          <label className="label" htmlFor="accountId">{isTransfer ? "Cuenta origen" : "Cuenta"}</label>
          <select id="accountId" name="accountId" required className="input">
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        {isAdmin && isTransfer && (
          <div>
            <label className="label" htmlFor="transferAccountId">Cuenta destino</label>
            <select id="transferAccountId" name="transferAccountId" required className="input" defaultValue="">
              <option value="">—</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label" htmlFor="status">Estado</label>
          <select id="status" name="status" className="input" defaultValue="PAID"><option value="PAID">Pagado</option><option value="PENDING">Por pagar</option></select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Nota</label>
        <input id="description" name="description" maxLength={300} className="input" />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Guardando…" : "Guardar"}</button>
        {state?.error && <p role="alert" className="text-sm text-negative">{state.error}</p>}
        {state?.ok && <p role="status" className="text-sm text-positive"><span className="inline-flex items-center gap-1">Guardado <Icon name="check" size={16} /></span></p>}
      </div>
    </form>
  );
}
