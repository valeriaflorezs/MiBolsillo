import { fmtDateTime } from "@/lib/admin-range";
import { describeAgent } from "@/lib/audit";
import { auth } from "@/lib/auth/config";
import { isPlatformAdmin } from "@/lib/auth/platform";
import { prisma } from "@/lib/db";
import { activityWhere, KIND_LABEL, workspaceNames, type ActivitySP } from "@/modules/admin/queries";

export const dynamic = "force-dynamic";

// Evita inyección de fórmulas al abrir el CSV en Excel/Sheets.
const cell = (v: string | number) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  if (!isPlatformAdmin((await auth())?.user?.email)) return new Response("No autorizado", { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams) as ActivitySP;
  const logs = await prisma.activityLog.findMany({ where: activityWhere(sp), orderBy: { createdAt: "desc" }, take: 5000 });
  const names = await workspaceNames(logs.map((l) => l.workspaceId));
  const lines = [["Fecha", "Usuario", "Empresa", "Tipo", "Resultado", "Qué hizo", "Detalle", "IP", "Navegador"].map(cell).join(",")];
  for (const l of logs) lines.push([fmtDateTime(l.createdAt), l.username ?? "", (l.workspaceId && names.get(l.workspaceId)) || "", KIND_LABEL[l.kind], l.ok ? "OK" : "Falló", l.summary, l.detail ?? "", l.ip ?? "", describeAgent(l.userAgent)].map(cell).join(","));
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="actividad.csv"', "Cache-Control": "no-store" },
  });
}
