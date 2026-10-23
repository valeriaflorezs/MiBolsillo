import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient };

function create() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  // Prisma parametriza todas las consultas. Evitar $queryRawUnsafe con datos del usuario.
  // "warn"/"error" dejan trazas en los logs de Railway; añadir "query" solo para depurar.
  return new PrismaClient({ adapter, log: ["warn", "error"] });
}

export const prisma = g.prisma ?? create();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
