"use client";

import { useEffect, useId, useRef, useState } from "react";

export type Explain = { title?: string; lines: string[] };

/**
 * Botón pequeño con una «i» que muestra cómo se calcula una cifra. Se abre con clic/toque o teclado
 * (Enter/Espacio), se cierra con Esc, tocando fuera o pulsándolo otra vez.
 */
export function InfoTip({ title, lines, className = "" }: Explain & { className?: string }) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const root = useRef<HTMLSpanElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const uid = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("touchstart", onDoc); document.addEventListener("keydown", onKey);
    // Mantiene el globo dentro de la pantalla (celulares / bordes).
    const r = pop.current?.getBoundingClientRect();
    if (r) setShift(Math.min(0, window.innerWidth - 12 - r.right) + Math.max(0, 12 - r.left));
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("touchstart", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <span ref={root} className={`relative inline-flex align-middle ${className}`}>
      <button type="button" aria-expanded={open} aria-controls={uid} aria-label={`¿Cómo se calcula${title ? `: ${title}` : ""}?`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShift(0); setOpen((o) => !o); }}
        className="grid size-[18px] place-items-center rounded-full border border-current text-[11px] font-semibold italic leading-none opacity-70 hover:opacity-100 focus-visible:opacity-100">i</button>
      {open && (
        <div ref={pop} id={uid} role="dialog" aria-label={title ?? "Cómo se calcula"} style={{ transform: `translateX(${shift}px)` }}
          className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-panel p-4 text-left text-sm font-normal not-italic leading-snug text-white shadow-lg">
          {title && <p className="mb-1.5 font-semibold">{title}</p>}
          <div className="space-y-1.5 text-white/90">{lines.map((l, i) => <p key={i}>{l}</p>)}</div>
        </div>
      )}
    </span>
  );
}
