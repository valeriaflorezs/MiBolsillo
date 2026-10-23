"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/config";

const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export async function loginWithCredentials(_: { error?: string } | null, fd: FormData): Promise<{ error?: string } | null> {
  try {
    await signIn("credentials", { username: fd.get("username"), password: fd.get("password"), redirectTo: safeNext(fd.get("next")) });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Usuario o contraseña incorrectos, o demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
    throw e; // el redirect de éxito es una excepción de Next que debe propagarse
  }
  return null;
}
