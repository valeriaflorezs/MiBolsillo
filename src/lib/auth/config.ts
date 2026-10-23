import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db";

// Sesión JWT (cookie HttpOnly): el usuario se persiste en `User` al iniciar sesión.
// Solo Google en el MVP: no hay contraseñas que guardar ni formularios públicos que proteger.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, profile }) {
      return Boolean(user.email) && profile?.email_verified !== false;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const email = user.email.toLowerCase();
        const u = await prisma.user.upsert({
          where: { email },
          update: { name: user.name, image: user.image },
          create: { email, name: user.name, image: user.image },
          select: { id: true },
        });
        token.uid = u.id;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
});
