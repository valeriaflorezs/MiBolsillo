"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Option = { id: string; label: string; detail: string };

/** Desplegable con buscador para elegir uno o varios gastos de Movimientos; envía los ids en campos ocultos con el mismo nombre. */
export function ExpensePicker({ name, options, placeholder = "Asignar a gastos…" }: { name: string; options: Option[]; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Option[]>([]);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? options.filter((o) => `${o.label} ${o.detail}`.toLowerCase().includes(t)) : options).slice(0, 50);
  }, [q, options]);

  return (
    <div ref={root} className="relative">
      {sel.map((o) => <input key={o.id} type="hidden" name={name} value={o.id} />)}
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="input !w-56 truncate text-left">
        {sel.length === 0 ? <span className="text-muted">{placeholder}</span> : sel.length === 1 ? sel[0].label : `${sel.length} gastos elegidos`}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-80 rounded-2xl border border-line bg-surface p-2 shadow-lg">
          <p className="mb-1 px-1 text-xs text-muted">Puedes elegir varios.</p>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por descripción, tienda o monto" aria-label="Buscar gasto" className="input mb-2" />
          <ul className="max-h-60 overflow-auto" role="listbox">
            {shown.length === 0 && <li className="p-2 text-sm text-muted">Sin gastos disponibles.</li>}
            {shown.map((o) => (
              <li key={o.id}>
                <button type="button" role="option" aria-selected={sel.some((x) => x.id === o.id)} onClick={() => setSel((c) => (c.some((x) => x.id === o.id) ? c.filter((x) => x.id !== o.id) : [...c, o]))} className="w-full rounded-xl px-3 py-2 text-left hover:bg-canvas">
                  <span className="flex items-center gap-2"><span aria-hidden className="w-4 text-brand-text">{sel.some((x) => x.id === o.id) ? "✓" : ""}</span><span className="min-w-0"><span className="block truncate text-sm font-medium">{o.label}</span><span className="block truncate text-xs text-muted">{o.detail}</span></span></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
