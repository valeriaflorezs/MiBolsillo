"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { run, userError, type ActionState } from "@/lib/actions";
import { requireWorkspace } from "@/lib/auth/permissions";
import { rateLimit } from "@/lib/security/rate-limit";
import { id } from "@/lib/validation";
import { importCapex, importFixed, type ImportResult } from "./import";

const MAX_BYTES = 300 * 1024;

function summary(r: ImportResult) {
  const base = `${r.created} importado(s)${r.skipped ? `, ${r.skipped} ya existían` : ""}`;
  if (!r.errors.length) return base;
  throw userError(`${base}. Revisa ${r.errors.length} fila(s): ${r.errors.slice(0, 3).join(" ")}${r.errors.length > 3 ? " …" : ""}`);
}

async function handle(fd: FormData, kind: "capex" | "fixed"): Promise<string> {
  const i = z.object({ workspaceId: id, propertyId: id }).parse({ workspaceId: fd.get("workspaceId"), propertyId: fd.get("propertyId") });
  const { userId } = await requireWorkspace(i.workspaceId, "airbnb:manage");
  rateLimit(`import:${userId}`, 10, 3_600_000);
  if (!(await prisma.property.count({ where: { id: i.propertyId, workspaceId: i.workspaceId } }))) throw new Error("FORBIDDEN");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) throw userError("Elige un archivo CSV.");
  if (file.size > MAX_BYTES) throw userError("El archivo supera 300 KB.");
  if (!/\.(csv|txt)$/i.test(file.name)) throw userError("El archivo debe ser .csv (en Excel: Guardar como → CSV).");
  const text = await file.text();
  const res = kind === "capex" ? await importCapex(i.workspaceId, i.propertyId, text) : await importFixed(i.workspaceId, i.propertyId, text);
  revalidatePath(`/w/${i.workspaceId}`, "layout");
  return summary(res);
}

export async function importCapexAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => handle(fd, "capex"));
}
export async function importFixedAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => handle(fd, "fixed"));
}
