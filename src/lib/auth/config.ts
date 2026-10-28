import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "./credentials";
import { rateLimit } from "@/lib/security/rate-limit";
import { logActivity } from "@/lib/audit";

// Sesión JWT (cookie HttpOnly): el usuario se persiste en `User` al iniciar sesión.
// Google para dueños/operadores; usuario + contraseña solo para cuentas de solo lectura que crea un ADMIN.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    Credentials({
      credentials: { username: {}, password: {} },
      async authorize(raw, request) {
        const parsed = z.object({ username: z.string().trim().toLowerCase().min(1).max(60), password: z.string().min(1).max(200) }).safeParse(raw);
        if (!parsed.success) return null;
        const { username, password } = parsed.data;
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "?";
        try {
          rateLimit(`login:u:${username}`, 8, 15 * 60_000); // frena fuerza bruta sobre un usuario
          rateLimit(`login:ip:${ip}`, 30, 15 * 60_000);
        } catch {
          return null;
        }
        const meta = { ip, userAgent: request.headers.get("user-agent") };
        const u = await prisma.user.findUnique({ where: { username }, select: { id: true, email: true, name: true, image: true, passwordHash: true, active: true } });
        const ok = await verifyPassword(password, u?.passwordHash);
        if (!u || !ok) {
          await logActivity({ kind: "LOGIN", ok: false, userId: u?.id, username, summary: "Intento de ingreso rechazado", detail: u ? "Contraseña incorrecta" : "Usuario inexistente" }, meta);
          return null;
        }
        if (!u.active) {
          await logActivity({ kind: "LOGIN", ok: false, userId: u.id, username, summary: "Intento de ingreso con cuenta desactivada" }, meta);
          return null;
        }
        await logActivity({ kind: "LOGIN", userId: u.id, username, summary: "Ingresó a la plataforma" }, meta);
        return { id: u.id, email: u.email, name: u.name, image: u.image };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/login" },
  events: {
    async signOut(message) {
      const uid = "token" in message ? (message.token?.uid as string | undefined) : undefined;
      if (uid) await logActivity({ kind: "LOGOUT", userId: uid, summary: "Cerró sesión" });
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") return Boolean(user.id);
      if (!user.email || profile?.email_verified === false) return false;
      const u = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() }, select: { active: true } });
      if (u && !u.active) {
        await logActivity({ kind: "LOGIN", ok: false, username: user.email.toLowerCase(), summary: "Intento de ingreso con cuenta desactivada" });
        return false;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "credentials" && user?.id) {
        token.uid = user.id; // el usuario ya existe: lo creó un ADMIN
      } else if (user?.email) {
        const email = user.email.toLowerCase();
        const u = await prisma.user.upsert({
          where: { email },
          update: { name: user.name, image: user.image },
          create: { email, name: user.name, image: user.image },
          select: { id: true },
        });
        token.uid = u.id;
        if (account) await logActivity({ kind: "LOGIN", userId: u.id, username: email, summary: "Ingresó a la plataforma" });
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
});
