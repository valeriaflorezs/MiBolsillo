/** Único superusuario de la plataforma. Se puede cambiar con SUPERUSER_EMAIL; es independiente del rol de cada negocio. */
const DEFAULT_SUPERUSER = "vflorez.contacto@gmail.com";
export const superuserEmail = (raw = process.env.SUPERUSER_EMAIL) => (raw?.trim() || DEFAULT_SUPERUSER).toLowerCase();
export const isPlatformAdmin = (email?: string | null, raw?: string) => Boolean(email) && email!.trim().toLowerCase() === superuserEmail(raw);
