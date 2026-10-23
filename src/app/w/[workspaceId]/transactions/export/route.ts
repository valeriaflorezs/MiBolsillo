import { requireWorkspace } from "@/lib/auth/permissions";
import { monthRange } from "@/lib/format";
import { searchTransactions } from "@/modules/core/queries";

export const dynamic = "force-dynamic";

// Evita inyección de fórmulas al abrir el CSV en Excel/Sheets.
const cell = (v: string | number) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  let ctx;
  try {
    ctx = await requireWorkspace(workspaceId, "transaction:create");
  } catch {
    return new Response("No autorizado", { status: 403 });
  }
  const sp = new URL(req.url).searchParams;
  const { key, start, end } = monthRange(sp.get("month") ?? undefined);
  const status = sp.get("status") === "PENDING" ? "PENDING" : sp.get("status") === "PAID" ? "PAID" : undefined;
  const t = sp.get("type");
  const { rows } = await searchTransactions({
    workspaceId, role: ctx.role, userId: ctx.userId, start, end, status,
    type: t === "INCOME" || t === "EXPENSE" || t === "TRANSFER" ? t : undefined,
    q: sp.get("q") || undefined, categoryId: sp.get("cat") || undefined, accountId: sp.get("acc") || undefined, page: 1, pageSize: 5000,
  });
  const lines = [["Fecha", "Tipo", "Estado", "Monto", "Proveedor", "Categoría", "Cuenta", "Nota"].map(cell).join(",")];
  for (const r of rows) lines.push([r.date.toISOString().slice(0, 10), r.type, r.status, r.amount, r.vendor ?? "", r.category?.name ?? "", r.account, r.description ?? ""].map(cell).join(","));
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="movimientos-${key}.csv"`, "Cache-Control": "no-store" },
  });
}
