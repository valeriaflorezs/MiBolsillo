import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$queryRaw`SELECT 1 FROM "User" LIMIT 1`; // verifica que las migraciones se aplicaron
    return Response.json({ ok: true });
  } catch (e) {
    // Solo al log del servidor (nunca en la respuesta): ayuda a diagnosticar la conexión en Railway.
    console.error("[health] fallo de base de datos:", e instanceof Error ? `${e.name}: ${e.message}` : e);
    return Response.json({ ok: false }, { status: 503 });
  }
}
