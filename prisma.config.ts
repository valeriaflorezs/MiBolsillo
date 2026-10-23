import type { PrismaConfig } from "prisma";

// Sin imports en runtime: así el CLI global de la imagen Docker puede leerlo sin node_modules.
// Prisma 7 no carga .env solo; en local lo cargamos aquí (en Railway las variables ya vienen en el entorno).
try {
  process.loadEnvFile();
} catch {
  /* no hay .env: normal en Railway y en CI */
}

export default {
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // `prisma generate` no conecta; por eso se tolera la URL vacía durante el build.
  datasource: { url: process.env.DATABASE_URL ?? "" },
} satisfies PrismaConfig;
