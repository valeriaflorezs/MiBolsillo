import { unstable_rethrow } from "next/navigation";
import { z, ZodError } from "zod";
import { actionStore, changeLabel, logActivity, type ActionCtx } from "@/lib/audit";

z.config(z.locales.es()); // mensajes de validación en español para lo que no tenga texto propio

/** Datos que se muestran UNA vez en una ventana flotante (p. ej. una contraseña recién generada). */
export type Secret = { title: string; note?: string; items: { label: string; value: string }[] };
export type ActionState = { ok?: boolean; error?: string; message?: string; secret?: Secret } | null;
type Outcome = string | void | { message?: string; secret: Secret };

const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión expiró. Inicia sesión de nuevo.",
  FORBIDDEN: "No tienes permiso para hacer esto.",
  RATE_LIMITED: "Demasiados intentos. Espera un momento.",
  NOT_FOUND: "No se encontró el registro.",
};

/** Ejecuta una acción y traduce errores a mensajes seguros (sin filtrar detalles internos). Deja el rastro en la bitácora de actividad. */
export async function run(fn: () => Promise<Outcome>): Promise<ActionState> {
  const store: { ctx?: ActionCtx } = {};
  return actionStore.run(store, async () => {
    try {
      const out = await fn();
      if (store.ctx) {
        const l = changeLabel(store.ctx.permission);
        await logActivity({ kind: l.kind, summary: store.ctx.summary ?? l.text, userId: store.ctx.userId, workspaceId: store.ctx.workspaceId });
      }
      if (out && typeof out === "object") return { ok: true, message: out.message, secret: out.secret };
      return { ok: true, message: out || undefined };
    } catch (e) {
      unstable_rethrow(e); // deja pasar redirect()/notFound()
      const code = e instanceof Error ? e.message : "";
      // Solo se registran los rechazos de permisos y los errores inesperados; los errores de validación son del formulario.
      if (store.ctx && !(e instanceof ZodError) && !code.startsWith("USER:")) {
        const l = changeLabel(store.ctx.permission);
        await logActivity({ kind: l.kind, ok: false, summary: `Falló: ${(store.ctx.summary ?? l.text).charAt(0).toLowerCase()}${(store.ctx.summary ?? l.text).slice(1)}`, detail: code in MESSAGES ? code : "ERROR", userId: store.ctx.userId, workspaceId: store.ctx.workspaceId });
      }
      if (e instanceof ZodError) return { error: e.issues[0]?.message ?? "Datos inválidos." };
      if (e instanceof Error && MESSAGES[e.message]) return { error: MESSAGES[e.message] };
      if (e instanceof Error && e.message.startsWith("USER:")) return { error: e.message.slice(5) };
      console.error(e);
      return { error: "Ocurrió un error. Inténtalo de nuevo." };
    }
  });
}
export const userError = (msg: string) => new Error(`USER:${msg}`);
