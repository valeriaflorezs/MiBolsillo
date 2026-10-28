"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Secret } from "@/lib/actions";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Sin permiso del portapapeles (p. ej. contexto no seguro): copia con un campo temporal.
    const t = document.createElement("textarea");
    t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select();
    const ok = document.execCommand("copy");
    t.remove();
    return ok;
  }
}

/** Ventana flotante para datos que se muestran una sola vez (contraseñas): cada dato con su botón de copiar. */
export function SecretDialog({ secret, onClose }: { secret: Secret; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const mark = async (key: string, text: string) => { if (await copy(text)) { setCopied(key); setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000); } };
  const all = secret.items.map((i) => `${i.label}: ${i.value}`).join("\n");

  return createPortal(
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={secret.title} className="w-full max-w-md space-y-4 rounded-3xl bg-surface p-6 text-ink shadow-card">
        <h2 className="text-lg font-semibold">{secret.title}</h2>
        {secret.note && <p className="text-sm text-muted">{secret.note}</p>}
        <ul className="space-y-2">
          {secret.items.map((i) => (
            <li key={i.label} className="flex items-center justify-between gap-3 rounded-xl bg-canvas p-3">
              <div className="min-w-0"><p className="text-xs text-muted">{i.label}</p><code className="block break-all text-base font-medium">{i.value}</code></div>
              <button type="button" onClick={() => mark(i.label, i.value)} className="btn btn-ghost shrink-0 !px-3 !py-1.5">{copied === i.label ? "¡Copiado!" : "Copiar"}</button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {secret.items.length > 1 && <button type="button" onClick={() => mark("__all", all)} className="btn btn-ghost">{copied === "__all" ? "¡Copiado!" : "Copiar todo"}</button>}
          <button ref={closeBtn} type="button" onClick={onClose} className="btn btn-primary">Listo</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
