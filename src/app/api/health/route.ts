import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$queryRaw`SELECT 1 FROM "User" LIMIT 1`; // verifica que las migraciones se aplicaron
    // `version`: commit desplegado (Railway lo inyecta); permite confirmar que un despliegue ya quedó activo.
    return Response.json({ ok: true, version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? null });
  } catch (e) {
    // Solo al log del servidor (nunca en la respuesta): ayuda a diagnosticar la conexión en Railway.
    console.error("[health] fallo de base de datos:", e instanceof Error ? `${e.name}: ${e.message}` : e);
    return Response.json({ ok: false }, { status: 503 });
  }
}
