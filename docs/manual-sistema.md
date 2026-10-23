# Manual de sistema — MiBolsillo
**Versión:** 0.1 · **Fecha:** 2026-10-23 · **Registro de cambios:** 0.1 versión inicial (esqueleto).

## Resumen y stack
SaaS multitenant (workspace = tenant). Next.js 14 App Router, TypeScript, Tailwind, Prisma 6, PostgreSQL 16 (Railway), Auth.js v5, Cloudflare R2, OCR con proveedor intercambiable (Claude por defecto).

## Estructura
Ver `docs/ARCHITECTURE.md` (carpetas, flujo OCR y plan de MVP).

## Instalación local
1. Node 20, Docker o Postgres 16 local.
2. `cp .env.example .env` y completar valores propios.
3. `npm install` → `npm run db:migrate` → `npm run dev`.

## Despliegue (Railway)
Ver sección 3 de `docs/ARCHITECTURE.md`. Migraciones automáticas con `preDeployCommand`. Healthcheck: `/api/health`.

## Variables de entorno (solo nombres)
`DATABASE_URL` (cadena Postgres) · `AUTH_SECRET` (aleatorio 32 bytes) · `AUTH_URL` · `AUTH_TRUST_HOST` · `AUTH_GOOGLE_ID` · `AUTH_GOOGLE_SECRET` · `R2_ACCOUNT_ID` · `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` · `R2_BUCKET` · `OCR_PROVIDER` · `ANTHROPIC_API_KEY` · `OCR_MODEL` · `OCR_MAX_FILE_MB` · `NEXT_PUBLIC_APP_URL`.

## Modelo de datos
`prisma/schema.prisma`. Cada tabla de negocio lleva `workspaceId`. Roles: ADMIN (todo) y OPERATOR (sin EBITDA ni PyG).

## Endpoints y acciones
| Ruta / acción | Permiso |
|---|---|
| `GET /api/health` | público (solo `{ok}`) |
| `createReceiptUploadAction` | miembro con `transaction:create`, 30/min por usuario |
| `getReceiptUrlAction` | miembro del workspace dueño del adjunto |

## Seguridad
Estado de los 20 puntos en `docs/seguridad-gate.md`.

## Integraciones y datos que reciben
Google OAuth (identidad) · Cloudflare R2 (facturas) · Anthropic API (imagen/PDF de la factura para OCR).

## Respaldo y operación
Backups programados de Postgres en Railway y prueba de restauración antes del lanzamiento; limpieza de adjuntos huérfanos (>24 h sin transacción); rotar claves de R2/Anthropic cada 90 días; revisar PRs de Dependabot semanalmente.

## Problemas comunes
- *El deploy no avanza:* falló `prisma migrate deploy`; revisar logs de predeploy.
- *Subida a R2 falla en el navegador:* revisar CORS del bucket y CSP `connect-src`.
