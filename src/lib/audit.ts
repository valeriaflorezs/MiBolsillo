import { AsyncLocalStorage } from "node:async_hooks";
import { headers } from "next/headers";
import type { ActivityKind } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/** Contexto de la acción en curso: lo llena `requireWorkspace`/`requirePlatformAdmin` y lo lee `run` para registrar el cambio. */
export type ActionCtx = { userId?: string; workspaceId?: string; permission?: string; summary?: string };
export const actionStore = new AsyncLocalStorage<{ ctx?: ActionCtx }>();
export const noteAction = (ctx: ActionCtx) => { const s = actionStore.getStore(); if (s) s.ctx = { ...s.ctx, ...ctx }; };

/** Qué hizo el usuario según el permiso con el que pasó la acción. */
const CHANGE_LABEL: Record<string, { kind: ActivityKind; text: string }> = {
  "transaction:create": { kind: "CHANGE", text: "Registró o modificó movimientos" },
  "capex:update": { kind: "CHANGE", text: "Actualizó ítems de CAPEX" },
  "airbnb:manage": { kind: "CHANGE", text: "Modificó propiedades, CAPEX o gastos fijos" },
  "budget:write": { kind: "CHANGE", text: "Modificó el presupuesto" },
  "dashboard:full": { kind: "CHANGE", text: "Modificó cuentas, categorías o ajustes" },
  "member:manage": { kind: "ADMIN", text: "Administró miembros del negocio" },
  "member:invite": { kind: "ADMIN", text: "Invitó o dio acceso a una persona" },
  "platform:admin": { kind: "ADMIN", text: "Administró la plataforma" },
};
export const changeLabel = (permission?: string) => CHANGE_LABEL[permission ?? ""] ?? { kind: "CHANGE" as ActivityKind, text: "Hizo un cambio" };

/** Secciones que se registran como consulta (primer tramo de la ruta después de /w/{id}/). */
const VIEW_LABEL: Record<string, string> = {
  "": "Abrió el resumen", transactions: "Consultó los movimientos", stats: "Consultó las estadísticas", capex: "Consultó el CAPEX", pyg: "Consultó el PyG",
  accounts: "Consultó las cuentas y deudas", budget: "Consultó el presupuesto", categories: "Consultó las categorías", fixed: "Consultó los gastos fijos",
  properties: "Consultó las propiedades", pending: "Consultó los pendientes", wishlist: "Consultó la lista de deseos", settings: "Abrió los ajustes del negocio",
  batch: "Abrió la carga en lote", debt: "Consultó las deudas", expenses: "Abrió el formulario de movimientos",
};
export const viewLabel = (section: string) => VIEW_LABEL[section];

type Entry = { kind: ActivityKind; summary: string; ok?: boolean; userId?: string | null; username?: string | null; workspaceId?: string | null; detail?: string | null };

/** IP y navegador de la solicitud en curso (si hay una). */
async function requestMeta() {
  try {
    const h = await headers();
    return { ip: h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? null, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/** Registra una acción. Nunca lanza: la bitácora no puede romper lo que el usuario estaba haciendo. */
export async function logActivity(e: Entry, meta?: { ip?: string | null; userAgent?: string | null }) {
  try {
    const m = meta ?? (await requestMeta());
    let username = e.username ?? null;
    if (!username && e.userId) username = (await prisma.user.findUnique({ where: { id: e.userId }, select: { username: true, email: true } }).then((u) => u && (u.username ?? u.email))) ?? null;
    await prisma.activityLog.create({
      data: { kind: e.kind, ok: e.ok ?? true, userId: e.userId ?? null, username, workspaceId: e.workspaceId ?? null, summary: e.summary.slice(0, 300), detail: e.detail?.slice(0, 500) ?? null, ip: m.ip?.slice(0, 64) ?? null, userAgent: m.userAgent?.slice(0, 300) ?? null },
    });
  } catch (err) {
    console.error("No se pudo registrar la actividad", err);
  }
}

/** Navegador · sistema operativo a partir del User-Agent (lectura rápida, no exhaustiva). */
export function describeAgent(ua?: string | null) {
  if (!ua) return "—";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Otro";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Otro";
  return `${browser} · ${os}`;
}

// Consultas repetidas (misma persona, misma sección) dentro de la ventana no generan otra fila.
const recent = new Map<string, number>();
export function shouldLogView(userId: string, key: string, now = Date.now(), windowMs = 60_000) {
  const k = `${userId}:${key}`;
  const last = recent.get(k);
  if (last && now - last < windowMs) return false;
  recent.set(k, now);
  if (recent.size > 5000) for (const [kk, t] of recent) if (now - t > windowMs) recent.delete(kk);
  return true;
}
