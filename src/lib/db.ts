import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient };
// Prisma parametriza todas las consultas. Evitar $queryRawUnsafe con datos del usuario.
// "warn"/"error" dejan trazas en los logs de Railway; añadir "query" solo para depurar.
export const prisma = g.prisma ?? new PrismaClient({ log: ["warn", "error"] });
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
