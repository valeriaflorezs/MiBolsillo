import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { noteAction } from "@/lib/audit";

export { isPlatformAdmin, superuserEmail } from "./superuser";
import { isPlatformAdmin } from "./superuser";

/** Server Actions: exige sesión del superusuario. */
export async function requirePlatformAdmin() {
  const s = await auth();
  if (!s?.user?.id) throw new Error("UNAUTHENTICATED");
  if (!isPlatformAdmin(s.user.email)) throw new Error("FORBIDDEN");
  noteAction({ userId: s.user.id, permission: "platform:admin" });
  return { userId: s.user.id, email: s.user.email! };
}

/** Páginas: lo mismo con redirecciones (quien no es el superusuario vuelve al inicio). */
export async function pagePlatformAdmin() {
  const s = await auth();
  if (!s?.user?.id) redirect("/login");
  if (!isPlatformAdmin(s.user.email)) redirect("/");
  return { userId: s.user.id, email: s.user.email! };
}
