"use server";

import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { logActivity, shouldLogView, viewLabel } from "@/lib/audit";
import { prisma } from "@/lib/db";

/** Registra que el usuario abrió una sección del negocio (la llama el rastreador del layout al cambiar de ruta). */
export async function trackViewAction(workspaceId: string, pathname: string) {
  try {
    const ids = z.object({ w: z.string().cuid(), p: z.string().max(200) }).parse({ w: workspaceId, p: pathname });
    const userId = (await auth())?.user?.id;
    if (!userId) return;
    const section = ids.p.split("/")[3] ?? ""; // /w/{id}/{sección}/...
    const summary = viewLabel(section);
    if (!ids.p.startsWith(`/w/${ids.w}`) || !summary || !shouldLogView(userId, `${ids.w}:${section}`)) return;
    if (!(await prisma.workspaceMember.count({ where: { workspaceId: ids.w, userId } }))) return;
    await logActivity({ kind: "QUERY", userId, workspaceId: ids.w, summary });
  } catch {
    /* la bitácora nunca debe afectar la navegación */
  }
}
