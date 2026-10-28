"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackViewAction } from "@/modules/core/track-actions";

/** Avisa al servidor cada vez que cambia la sección abierta (alimenta la pestaña Actividad del panel de administración). */
export function ViewTracker({ workspaceId }: { workspaceId: string }) {
  const pathname = usePathname();
  useEffect(() => { void trackViewAction(workspaceId, pathname); }, [workspaceId, pathname]);
  return null;
}
