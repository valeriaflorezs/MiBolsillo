"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth/permissions";
import { rateLimit } from "@/lib/security/rate-limit";
import { BATCH_SPECS, MAX_BATCH_ROWS } from "@/lib/batch/spec";
import { id } from "@/lib/validation";
import { norm } from "@/lib/csv";
import { createCapexRows, parseAllocations, parseCapex, parseFixed, parseTransactions, type RowIssue } from "@/modules/airbnb/import";

export type BatchResult = { ok: boolean; message: string; errors: RowIssue[]; warnings: RowIssue[] };

const input = z.object({
  kind: z.enum(["transactions", "capex", "fixed", "allocations"]),
  workspaceId: id,
  propertyId: z.string().optional(),
  dryRun: z.boolean(),
  rows: z.array(z.array(z.string().max(400)).max(12)).min(1, "La tabla está vacía.").max(MAX_BATCH_ROWS, `Máximo ${MAX_BATCH_ROWS} filas por carga.`),
});

const fail = (message: string, errors: RowIssue[] = [], warnings: RowIssue[] = []): BatchResult => ({ ok: false, message, errors, warnings });

/** Valida (dryRun) o guarda una tabla pegada/editada. Todo o nada: si una fila falla, no se guarda ninguna. */
export async function batchAction(raw: unknown): Promise<BatchResult> {
  try {
    const parsed = input.safeParse(raw);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
    const i = parsed.data;
    const { userId } = await requireWorkspace(i.workspaceId, i.kind === "transactions" || i.kind === "allocations" ? "dashboard:full" : "airbnb:manage");
    rateLimit(`batch:${userId}`, 60, 3_600_000);

    // Filas vacías se ignoran, pero se conserva el número de fila original para marcar errores en la tabla.
    const keys = BATCH_SPECS[i.kind].cols.map((c) => c.key);
    const live = i.rows.map((r, row) => ({ row, r })).filter(({ r }) => r.some((c) => c.trim() !== ""));
    if (!live.length) return fail("La tabla está vacía.");
    const objs = live.map(({ r }) => Object.fromEntries(keys.map((k, c) => [k, (r[c] ?? "").trim()])));
    const back = <T extends RowIssue>(l: T[]) => l.map((e) => ({ ...e, row: live[e.row].row }));

    let res: { errors: RowIssue[]; warnings: RowIssue[]; skipped: number; data: unknown[] };
    let write: () => Promise<unknown>;
    const w = i.workspaceId;
    if (i.kind === "transactions") {
      const [accounts, categories] = await Promise.all([
        prisma.financialAccount.findMany({ where: { workspaceId: w, archived: false }, select: { id: true, name: true } }),
        prisma.category.findMany({ where: { workspaceId: w }, select: { id: true, name: true } }),
      ]);
      const p = parseTransactions(objs, { accounts, categories });
      res = p;
      write = () => prisma.transaction.createMany({ data: p.data.map((d) => ({ ...d, workspaceId: w, createdById: userId, paidAt: d.status === "PAID" ? d.date : null })) });
    } else if (i.kind === "allocations") {
      const loanId = i.propertyId ?? ""; // aquí propertyId lleva el id del crédito elegido
      if (!(await prisma.loan.count({ where: { id: loanId, workspaceId: w } }))) throw new Error("FORBIDDEN");
      const existing = new Set((await prisma.loanAllocation.findMany({ where: { loanId }, select: { name: true } })).map((x) => norm(x.name)));
      const base = await prisma.loanAllocation.count({ where: { loanId } });
      const p = parseAllocations(objs, existing);
      res = p;
      write = () => prisma.loanAllocation.createMany({ data: p.data.map((d, k) => ({ ...d, loanId, workspaceId: w, sortOrder: base + k })) });
    } else {
      const propertyId = i.propertyId ?? "";
      if (!(await prisma.property.count({ where: { id: propertyId, workspaceId: w } }))) throw new Error("FORBIDDEN");
      if (i.kind === "capex") {
        const existing = new Set((await prisma.capexItem.findMany({ where: { workspaceId: w, propertyId }, select: { itemDescription: true } })).map((x) => norm(x.itemDescription)));
        const own = await prisma.category.findMany({ where: { workspaceId: w, expenseKind: "CAPEX", parentId: null, archived: false }, select: { name: true } });
        const p = parseCapex(objs, existing, { lenientCategory: true, categoryNames: own.map((c) => c.name) });
        res = p;
        write = () => createCapexRows(w, propertyId, p.data);
      } else {
        const existing = new Set((await prisma.fixedExpense.findMany({ where: { workspaceId: w, propertyId }, select: { name: true } })).map((x) => norm(x.name)));
        const p = parseFixed(objs, existing);
        res = p;
        write = () => prisma.fixedExpense.createMany({ data: p.data.map((d) => ({ ...d, workspaceId: w, propertyId })) });
      }
    }

    const errors = back(res.errors), warnings = back(res.warnings);
    if (errors.length) return fail(`Corrige ${errors.length} fila(s) marcadas en rojo; no se guardó nada.`, errors, warnings);
    const n = res.data.length;
    const skipped = res.skipped ? ` (${res.skipped} ya existían y se omiten)` : "";
    if (!n) return { ok: true, message: `No hay filas nuevas${skipped}.`, errors: [], warnings };
    if (i.dryRun) return { ok: true, message: `Todo en orden: se crearán ${n} fila(s)${skipped}.`, errors: [], warnings };
    await write();
    revalidatePath(`/w/${w}`, "layout");
    return { ok: true, message: `Se guardaron ${n} fila(s)${skipped}.`, errors: [], warnings };
  } catch (e) {
    unstable_rethrow(e);
    const m = e instanceof Error ? e.message : "";
    if (m === "FORBIDDEN") return fail("No tienes permiso para hacer esto.");
    if (m === "UNAUTHENTICATED") return fail("Tu sesión expiró. Inicia sesión de nuevo.");
    if (m === "RATE_LIMITED") return fail("Demasiados intentos. Espera un momento.");
    console.error(e);
    return fail("Ocurrió un error. Inténtalo de nuevo.");
  }
}
