"use client";

import { useActionState, useCallback, useState } from "react";
import type { ActionState } from "@/lib/actions";
import { IconButton } from "@/components/ui/icon-button";
import type { UiIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { ActionForm } from "./action-form";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  /** Se envían como campos ocultos. */
  fields?: Record<string, string>;
  icon: UiIcon;
  /** Nombre de la acción (tooltip y título de la ventana). */
  label: string;
  /** Si se da, pide confirmación con este texto antes de ejecutar. */
  confirm?: string;
  /** Campos extra (select, input…) que se piden en la ventana antes de ejecutar. */
  children?: React.ReactNode;
  tone?: "default" | "danger";
  submitLabel?: string;
};

/** Acción de una fila como botón de icono. Con `confirm` o `children` abre una ventana de confirmación; sin ellos se ejecuta directo. */
export function IconAction({ action, fields = {}, icon, label, confirm, children, tone = "default", submitLabel }: Props) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const [state, formAction, pending] = useActionState(action, null);
  const hidden = Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);

  if (!confirm && !children) {
    return (
      <form action={formAction} className="inline-flex items-center gap-2">
        {hidden}
        <IconButton type="submit" icon={icon} label={label} tone={tone} disabled={pending} />
        {state?.error && <span role="alert" className="text-xs text-negative">{state.error}</span>}
      </form>
    );
  }
  return (
    <>
      <IconButton icon={icon} label={label} tone={tone} onClick={() => setOpen(true)} />
      {open && (
        <Modal title={label} onClose={close}>
          <ActionForm action={action} submitLabel={submitLabel ?? label} variant={tone === "danger" ? "danger" : "primary"} resetOnSuccess={false}>
            {hidden}
            {confirm && <p className="text-sm">{confirm}</p>}
            {children}
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
