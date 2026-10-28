"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";

/** Ventana flotante centrada: se cierra con Esc, tocando fuera o con la X. Cierra sola cuando un formulario de adentro termina bien (evento `actiondone`). */
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const el = body.current;
    const onDone = () => onClose();
    document.addEventListener("keydown", onKey);
    el?.addEventListener("actiondone", onDone);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    el?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, button[type=submit]")?.focus();
    return () => { document.removeEventListener("keydown", onKey); el?.removeEventListener("actiondone", onDone); document.body.style.overflow = prev; };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[150] grid place-items-center overflow-y-auto bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} space-y-4 rounded-3xl bg-surface p-6 text-ink shadow-card`}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-canvas"><Icon name="close" /></button>
        </div>
        <div ref={body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
