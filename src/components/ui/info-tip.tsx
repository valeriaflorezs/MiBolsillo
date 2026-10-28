"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type Explain = { title?: string; lines: string[] };

/**
 * Botón pequeño con una «i» que muestra cómo se calcula una cifra. Se abre con clic/toque o teclado
 * (Enter/Espacio), se cierra con Esc, tocando fuera o pulsándolo otra vez.
 */
export function InfoTip({ title, lines, className = "" }: Explain & { className?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const root = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const uid = useId();

  // El globo va en un portal con posición fija: así ninguna tarjeta vecina (ni su blur) lo tapa o recorta.
  const place = () => {
    const b = btn.current?.getBoundingClientRect(); const w = pop.current?.offsetWidth;
    if (!b || !w) return;
    setPos({ top: b.bottom + 8, left: Math.max(12, Math.min(b.left, window.innerWidth - w - 12)) });
  };
  useLayoutEffect(() => { if (open) place(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!root.current?.contains(t) && !pop.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onDoc); document.addEventListener("touchstart", onDoc); document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true); window.addEventListener("resize", close);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("touchstart", onDoc); document.removeEventListener("keydown", onKey); window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [open]);

  return (
    <span ref={root} className={`relative inline-flex align-middle ${className}`}>
      <button ref={btn} type="button" aria-expanded={open} aria-controls={uid} aria-label={`¿Cómo se calcula${title ? `: ${title}` : ""}?`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPos(null); setOpen((o) => !o); }}
        className="grid size-[18px] place-items-center rounded-full border border-current text-[11px] font-semibold italic leading-none opacity-70 hover:opacity-100 focus-visible:opacity-100">i</button>
      {open && createPortal(
        <div ref={pop} id={uid} role="dialog" aria-label={title ?? "Cómo se calcula"}
          style={{ position: "fixed", top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? "visible" : "hidden" }}
          className="z-[100] w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-panel p-4 text-left text-sm font-normal not-italic leading-snug text-white shadow-lg">
          {title && <p className="mb-1.5 font-semibold">{title}</p>}
          <div className="space-y-1.5 text-white/90">{lines.map((l, i) => <p key={i}>{l}</p>)}</div>
        </div>, document.body)}
    </span>
  );
}
