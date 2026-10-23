# Manual de sistema — MiBolsillo
**Versión:** 2.0 · **Fecha:** 2026-10-23 · **Cambios:** 2.0 CRUD completo, estadísticas, rediseño, pruebas end-to-end.

## Arquitectura y stack
Next.js 16 (App Router, Server Actions, salida `standalone`), React 19, TypeScript, Tailwind 3, Prisma 7 (adaptador `pg`), PostgreSQL 16, Auth.js v5 (Google, sesión JWT), Cloudflare R2, OCR con Claude (intercambiable en `src/lib/ocr`). Node 22. Diseño y plan: `docs/ARCHITECTURE.md`, `docs/DESIGN.md`.

Multitenancy: un workspace = un negocio; toda tabla de negocio lleva `workspaceId` y toda consulta lo filtra. Permisos en `src/lib/auth/rbac.ts`; verificación en `src/lib/auth/permissions.ts` (`requireWorkspace` para acciones, `pageCtx` para páginas).

## Estructura
`prisma/` esquema y migraciones · `src/app/` rutas (`/login`, `/workspaces/new`, `/invite/[token]`, `/w/[workspaceId]/…`) · `src/modules/core` y `src/modules/airbnb` (acciones, consultas) · `src/lib` (auth, db, finance, ocr, storage, security) · `src/components` · `docs/`.

## Instalación local
1. Node 22 y Postgres 16.
2. `cp .env.example .env` y completa las variables.
3. `npm install && npx prisma migrate dev && npm run dev`.
4. Pruebas: `npm test` (las de integración usan `DATABASE_URL`). Calidad: `npm run lint && npm run typecheck`.

## Despliegue (Railway)
Servicio web desde GitHub (Dockerfile) + servicio PostgreSQL. El contenedor ejecuta `prisma migrate deploy` al arrancar (ver `CMD` del Dockerfile) y `railway.json` hace healthcheck en `/api/health`. Activar “Wait for CI”. Entornos: `production` (rama `main`) y `staging`.

## Variables de entorno (solo nombres)
`DATABASE_URL` · `AUTH_SECRET` · `AUTH_URL` · `AUTH_TRUST_HOST` · `AUTH_GOOGLE_ID` · `AUTH_GOOGLE_SECRET` · `R2_ACCOUNT_ID` · `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` · `R2_BUCKET` · `OCR_PROVIDER` · `OCR_MODEL` · `ANTHROPIC_API_KEY` · `OCR_MAX_FILE_MB`.
- Google: URI de redirección `https://<dominio>/api/auth/callback/google`.
- R2: bucket privado y CORS que permita `PUT` desde el dominio de la app.

## Modelo de datos
`prisma/schema.prisma`. Las tablas `AuthAccount`, `Session` y `VerificationToken` no se usan (sesiones JWT) y pueden eliminarse en una migración futura.

## Acciones y permisos
| Área | Permiso |
|---|---|
| Crear gasto, comprobantes, lista de deseos, marcar CAPEX | `transaction:create` / `capex:update` (ADMIN y OPERATOR). OPERATOR solo crea GASTOS y solo ve los suyos |
| Ingresos, transferencias, cuentas, resumen | `dashboard:full` (ADMIN) |
| PyG | `pyg:read` (ADMIN) |
| Reservas, gastos fijos, propiedades, ítems CAPEX | `airbnb:manage` (ADMIN) |
| Presupuesto | `budget:write` (ADMIN) |
| Miembros, invitaciones, eliminar negocio | `member:manage` (ADMIN) |

## Flujo OCR
`createReceiptUploadAction` → PUT directo a R2 → `processReceiptAction` (verifica magic bytes, llama al proveedor, guarda `rawOcrData`) → el usuario confirma → `createTransactionAction` enlaza el adjunto. Los adjuntos sin gasto se borran a las 24 h (en la siguiente subida del mismo usuario).

## Seguridad
Ver `docs/seguridad-gate.md` (20 puntos y revisión de 23 puntos).

## Operación
Backups programados de Postgres en Railway y prueba de restauración antes de publicar · rotar claves de R2/Anthropic cada 90 días · revisar PRs de Dependabot · si se escala a más de una réplica, mover `rateLimit` a Redis.

## Problemas comunes
- *Deploy falla en migraciones:* revisar `DATABASE_URL` y logs de predeploy.
- *Login vuelve a /login:* revisar `AUTH_SECRET`, `AUTH_URL` y la URI de redirección en Google.
- *Subida de comprobantes falla:* CORS del bucket, variables `R2_*` y CSP `connect-src`.
- *OCR falla:* revisar `ANTHROPIC_API_KEY`; el formulario sigue funcionando a mano.

## Rutas (v2.0)
`/w/[id]`: resumen · `transactions` (lista+detalle, `[txId]/edit`, `export` CSV) · `expenses/new` · `pending` · `stats` · `accounts` · `categories` · `budget` · `wishlist` · `settings` · `more` · Airbnb: `capex` (+`[itemId]/edit`), `pyg`, `reservations` (+`[resId]/edit`), `fixed` (+`[fixedId]/edit`), `properties`. Globales: `/login`, `/workspaces/new`, `/invite/[token]`, `/account`, `/privacidad`, `/terminos`, `/api/health`.

## Acciones del servidor
`modules/core/{actions,finance-actions,crud-actions,receipt-actions}.ts` y `modules/airbnb/{actions,crud-actions}.ts`. Reglas comunes: zod → `requireWorkspace(permiso)` → verificación de pertenencia de cada ID relacionado → operación filtrada por `workspaceId`. `canMutateTx` (en `lib/auth/rbac.ts`) decide quién edita/elimina un movimiento (ADMIN todo; OPERATOR sus gastos < 48 h).

## Pruebas
- Unitarias: `rbac.test.ts`, `pyg.test.ts`, `period.test.ts`.
- Integración (Postgres): `queries.int.test.ts` (PyG, filtros, alcance del operador, aislamiento entre negocios).
- Verificación end-to-end (manual con Playwright contra Postgres local y sesiones JWT firmadas): creación/edición/eliminación de movimientos, transferencias, reservas, CAPEX, gastos fijos, categorías, cuentas, presupuesto, invitaciones, estadísticas por periodo, exportación CSV, degradación del OCR sin R2 y restricciones del Operador.
