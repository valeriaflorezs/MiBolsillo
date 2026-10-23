import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión expiró. Inicia sesión de nuevo.",
  FORBIDDEN: "No tienes permiso para hacer esto.",
  RATE_LIMITED: "Demasiados intentos. Espera un momento.",
  NOT_FOUND: "No se encontró el registro.",
};

/** Ejecuta una acción y traduce errores a mensajes seguros (sin filtrar detalles internos). */
export async function run(fn: () => Promise<string | void>): Promise<ActionState> {
  try {
    const message = await fn();
    return { ok: true, message: message || undefined };
  } catch (e) {
    unstable_rethrow(e); // deja pasar redirect()/notFound()
    if (e instanceof ZodError) return { error: e.issues[0]?.message ?? "Datos inválidos." };
    if (e instanceof Error && MESSAGES[e.message]) return { error: MESSAGES[e.message] };
    if (e instanceof Error && e.message.startsWith("USER:")) return { error: e.message.slice(5) };
    console.error(e);
    return { error: "Ocurrió un error. Inténtalo de nuevo." };
  }
}
export const userError = (msg: string) => new Error(`USER:${msg}`);
