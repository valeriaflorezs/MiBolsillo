"use client";

import { Paperclip } from "lucide-react";
import { useState } from "react";
import { getReceiptUrlAction } from "@/modules/core/receipt-actions";

/** Abre el comprobante con una URL firmada de 10 minutos (el bucket es privado). */
export function ReceiptLink({ workspaceId, attachmentId, name }: { workspaceId: string; attachmentId: string; name: string }) {
  const [err, setErr] = useState("");
  return (
    <div>
      <button type="button" className="btn btn-ghost" onClick={async () => {
        setErr("");
        try {
          const { url } = await getReceiptUrlAction({ workspaceId, attachmentId });
          window.open(url, "_blank", "noopener,noreferrer");
        } catch { setErr("No se pudo abrir el comprobante."); }
      }}><Paperclip size={16} aria-hidden />{name}</button>
      {err && <p role="alert" className="mt-1 text-sm text-negative">{err}</p>}
    </div>
  );
}
