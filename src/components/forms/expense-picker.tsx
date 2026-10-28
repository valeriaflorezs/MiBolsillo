"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Option = { id: string; label: string; detail: string };

/** Desplegable con buscador para elegir uno o varios gastos de Movimientos; envía los ids en campos ocultos con el mismo nombre. */
export function ExpensePicker({ name, options, placeholder = "Asignar a gastos…" }: { name: string; options: Option[]; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Option[]>([]);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);

  // El panel va en un portal con posición fija para que la tabla con scroll no lo recorte.
  const toggle = () => {
    if (!open) {
      const b = btn.current?.getBoundingClientRect();
      if (b) setPos({ top: Math.min(b.bottom + 4, window.innerHeight - 360), left: Math.max(12, Math.min(b.left, window.innerWidth - 332)) });
    }
    setOpen((o) => !o);
  };
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { const t = e.target as Node; if (!root.current?.contains(t) && !pop.current?.contains(t)) setOpen(false); };
    const close = () => setOpen(false);
    const onScroll = (e: Event) => { if (!pop.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true); window.addEventListener("resize", close);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", close); };
  }, [open]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? options.filter((o) => `${o.label} ${o.detail}`.toLowerCase().includes(t)) : options).slice(0, 50);
  }, [q, options]);

  return (
    <div ref={root} className="relative">
      {sel.map((o) => <input key={o.id} type="hidden" name={name} value={o.id} />)}
      <button ref={btn} type="button" aria-expanded={open} onClick={toggle} className="input !w-56 truncate text-left">
        {sel.length === 0 ? <span className="text-muted">{placeholder}</span> : sel.length === 1 ? sel[0].label : `${sel.length} gastos elegidos`}
      </button>
      {open && pos && createPortal(
        <div ref={pop} style={{ position: "fixed", top: pos.top, left: pos.left }} className="z-[100] w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-line bg-surface p-2 shadow-lg">
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
        </div>, document.body)}
    </div>
  );
}
