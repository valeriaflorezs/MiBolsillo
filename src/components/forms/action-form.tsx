"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ActionState } from "@/lib/actions";
import { IconButton } from "@/components/ui/icon-button";
import type { UiIcon } from "@/components/ui/icons";
import { SecretDialog } from "./secret-dialog";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  submitLabel: string;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  variant?: "primary" | "ghost" | "danger";
  /** Si se da, el envío es un botón de icono (el nombre va en el tooltip) en lugar de un botón con texto. */
  submitIcon?: UiIcon;
};

export function ActionForm({ action, submitLabel, children, className = "space-y-4", resetOnSuccess = true, variant = "primary", submitIcon }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const [closed, setClosed] = useState<ActionState>(null); // el resultado cuya ventana ya se cerró
  // Avisa a la ventana que lo contiene (si la hay) para que se cierre; con una clave por mostrar, espera a que se cierre su ventana.
  const done = () => ref.current?.dispatchEvent(new CustomEvent("actiondone", { bubbles: true }));
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
    if (state?.ok && !state.secret) ref.current?.dispatchEvent(new CustomEvent("actiondone", { bubbles: true }));
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <div className="flex items-center gap-3">
        {submitIcon ? <IconButton type="submit" icon={submitIcon} label={submitLabel} disabled={pending} tone={variant === "primary" ? "primary" : variant === "danger" ? "danger" : "default"} /> : (
          <button type="submit" disabled={pending} className={`btn ${variant === "primary" ? "btn-primary" : variant === "danger" ? "btn-danger" : "btn-ghost"}`}>
            {pending ? "Guardando…" : submitLabel}
          </button>
        )}
        {state?.error && <p role="alert" className="text-sm text-negative">{state.error}</p>}
        {state?.secret && closed !== state && <SecretDialog secret={state.secret} onClose={() => { setClosed(state); done(); }} />}
        {state?.ok && <p role="status" className="text-sm text-positive">{state.message ?? "Listo"}</p>}
      </div>
    </form>
  );
}
