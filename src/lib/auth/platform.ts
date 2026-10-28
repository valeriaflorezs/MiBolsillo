import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { noteAction } from "@/lib/audit";

/** Administradores de la plataforma: correos en ADMIN_EMAILS (separados por coma). Es independiente del rol de cada negocio. */
export function platformAdminEmails(raw = process.env.ADMIN_EMAILS) {
  return new Set((raw ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean));
}
export const isPlatformAdmin = (email?: string | null, raw?: string) => Boolean(email) && platformAdminEmails(raw).has(email!.toLowerCase());

/** Server Actions: exige sesión de administrador de la plataforma. */
export async function requirePlatformAdmin() {
  const s = await auth();
  if (!s?.user?.id) throw new Error("UNAUTHENTICATED");
  if (!isPlatformAdmin(s.user.email)) throw new Error("FORBIDDEN");
  noteAction({ userId: s.user.id, permission: "platform:admin" });
  return { userId: s.user.id, email: s.user.email! };
}

/** Páginas: lo mismo con redirecciones (quien no es administrador ve un 404 en lugar de la pantalla). */
export async function pagePlatformAdmin() {
  const s = await auth();
  if (!s?.user?.id) redirect("/login");
  if (!isPlatformAdmin(s.user.email)) redirect("/");
  return { userId: s.user.id, email: s.user.email! };
}
