"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/actions";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  submitLabel: string;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  variant?: "primary" | "ghost";
};

export function ActionForm({ action, submitLabel, children, className = "space-y-4", resetOnSuccess = true, variant = "primary" }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={`btn ${variant === "primary" ? "btn-primary" : "btn-ghost"}`}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        {state?.error && <p role="alert" className="text-sm text-negative">{state.error}</p>}
        {state?.ok && <p role="status" className="text-sm text-positive">{state.message ?? "Listo"}</p>}
      </div>
    </form>
  );
}
