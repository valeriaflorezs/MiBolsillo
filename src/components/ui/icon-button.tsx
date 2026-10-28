"use client";

import Link from "next/link";
import { forwardRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, type UiIcon } from "./icons";

type Props = {
  icon: UiIcon;
  /** Nombre de la acción: va en el tooltip y como etiqueta accesible. */
  label: string;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  tone?: "default" | "primary" | "danger";
  className?: string;
};

const TONE = {
  default: "border border-white/60 bg-white/60 text-ink hover:bg-white/80 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/20",
  primary: "bg-brand text-white hover:opacity-90",
  danger: "border border-negative/40 bg-white/50 text-negative hover:bg-negative/10 dark:bg-white/5",
} as const;

/** Botón compacto con icono; el nombre de la acción se ve en un tooltip al pasar el cursor o enfocarlo. */
export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton({ icon, label, onClick, href, type = "button", disabled, tone = "default", className = "" }, ref) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const show = (el: HTMLElement) => { const r = el.getBoundingClientRect(); setTip({ x: r.left + r.width / 2, y: r.bottom + 6 }); };
  const hide = () => setTip(null);
  const cls = `inline-grid size-9 shrink-0 place-items-center rounded-full backdrop-blur transition disabled:opacity-50 ${TONE[tone]} ${className}`;
  const handlers = { onMouseEnter: (e: React.MouseEvent<HTMLElement>) => show(e.currentTarget), onMouseLeave: hide, onFocus: (e: React.FocusEvent<HTMLElement>) => show(e.currentTarget), onBlur: hide };
  return (
    <>
      {href ? (
        <Link href={href} aria-label={label} className={cls} {...handlers}><Icon name={icon} /></Link>
      ) : (
        <button ref={ref} type={type} aria-label={label} disabled={disabled} onClick={() => { hide(); onClick?.(); }} className={cls} {...handlers}><Icon name={icon} /></button>
      )}
      {tip && createPortal(
        <span role="tooltip" style={{ position: "fixed", left: tip.x, top: tip.y, transform: "translateX(-50%)" }} className="pointer-events-none z-[300] whitespace-nowrap rounded-lg bg-panel px-2.5 py-1 text-xs font-medium text-white shadow-lg">{label}</span>,
        document.body,
      )}
    </>
  );
});
