"use client";

import { useCallback, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import type { UiIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";

/** Botón de icono (por omisión «+») que abre un formulario en una ventana flotante. */
export function FormDialog({ label, title, icon = "add", tone = "primary", wide, children }: { label: string; title?: string; icon?: UiIcon; tone?: "default" | "primary"; wide?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <IconButton icon={icon} label={label} tone={tone} onClick={() => setOpen(true)} />
      {open && <Modal title={title ?? label} wide={wide} onClose={close}>{children}</Modal>}
    </>
  );
}
