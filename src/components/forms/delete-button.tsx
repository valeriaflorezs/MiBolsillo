"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions";

/** Botón destructivo con confirmación nativa. `fields` se envía como inputs ocultos. */
export function DeleteButton({ action, fields, label = "Eliminar", confirmText = "¿Seguro? Esta acción no se puede deshacer." }: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  label?: string;
  confirmText?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} onSubmit={(e) => { if (!window.confirm(confirmText)) e.preventDefault(); }} className="flex items-center gap-2">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" disabled={pending} className="btn btn-danger">{pending ? "Eliminando…" : label}</button>
      {state?.error && <p role="alert" className="text-sm text-negative">{state.error}</p>}
    </form>
  );
}
