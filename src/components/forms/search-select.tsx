"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icons";

type Option = { id: string; label: string; detail?: string };

/** Lista desplegable con buscador para elegir una sola opción (o ninguna). El valor lo controla el formulario. */
export function SearchSelect({ id, name, value, onChange, options, placeholder, emptyLabel, searchPlaceholder = "Buscar…" }: {
  id?: string; name: string; value: string; onChange: (id: string) => void; options: Option[]; placeholder: string; emptyLabel: string; searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const sel = options.find((o) => o.id === value);

  const toggle = () => {
    if (!open) {
      const b = btn.current?.getBoundingClientRect();
      if (b) setPos({ top: Math.min(b.bottom + 4, window.innerHeight - 380), left: b.left, width: Math.max(b.width, 320) });
      setQ("");
    }
    setOpen((o) => !o);
  };
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDoc = (e: MouseEvent) => { const t = e.target as Node; if (!root.current?.contains(t) && !pop.current?.contains(t)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onScroll = (e: Event) => { if (!pop.current?.contains(e.target as Node)) close(); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true); window.addEventListener("resize", close);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", close); };
  }, [open]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? options.filter((o) => `${o.label} ${o.detail ?? ""}`.toLowerCase().includes(t)) : options).slice(0, 60);
  }, [q, options]);
  const pick = (v: string) => { onChange(v); setOpen(false); };

  return (
    <div ref={root} className="relative">
      <input type="hidden" name={name} value={value} />
      <button ref={btn} id={id} type="button" aria-expanded={open} aria-haspopup="listbox" onClick={toggle} className="input flex items-center justify-between gap-2 text-left">
        <span className={`truncate ${sel ? "" : "text-muted"}`}>{sel ? sel.label : placeholder}</span>
        {sel ? <span role="button" tabIndex={0} aria-label="Quitar selección" onClick={(e) => { e.stopPropagation(); onChange(""); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onChange(""); } }} className="grid size-5 shrink-0 place-items-center rounded-full hover:bg-canvas"><Icon name="close" size={14} /></span> : <Icon name="arrow_down" size={16} className="shrink-0 text-muted" />}
      </button>
      {open && pos && createPortal(
        <div ref={pop} style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }} className="z-[250] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-line bg-surface p-2 text-ink shadow-lg">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} aria-label="Buscar" className="input mb-2" />
          <ul className="max-h-64 overflow-auto" role="listbox">
            <li><button type="button" role="option" aria-selected={!value} onClick={() => pick("")} className="w-full rounded-xl px-3 py-2 text-left text-sm text-muted hover:bg-canvas">{emptyLabel}</button></li>
            {shown.length === 0 && <li className="p-2 text-sm text-muted">Sin resultados.</li>}
            {shown.map((o) => (
              <li key={o.id}>
                <button type="button" role="option" aria-selected={o.id === value} onClick={() => pick(o.id)} className={`w-full rounded-xl px-3 py-2 text-left hover:bg-canvas ${o.id === value ? "bg-brand/15" : ""}`}>
                  <span className="block truncate text-sm font-medium">{o.label}</span>
                  {o.detail && <span className="block truncate text-xs text-muted">{o.detail}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
