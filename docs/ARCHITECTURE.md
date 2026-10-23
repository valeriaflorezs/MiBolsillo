# MiBolsillo — Arquitectura, despliegue y plan de MVP

SaaS multitenant de finanzas personales y control de emprendimientos. Foco del MVP: **Airbnb / alquiler corto**.

## 1. Decisiones clave

| Tema | Decisión | Por qué |
|---|---|---|
| Multitenancy | Una BD, `workspaceId` en cada tabla de negocio | Simple y barato en Railway; aislamiento garantizado por `requireWorkspace()` (ver `src/lib/auth/permissions.ts`) |
| Auth | Auth.js v5 + Prisma adapter | Modelos `User/AuthAccount/Session` ya en el schema. El modelo `AuthAccount` evita chocar con `FinancialAccount` (Nequi/bancos) |
| RBAC | `WorkspaceMember.role` = `ADMIN` \| `OPERATOR` | OPERATOR registra gastos/CAPEX; **no** tiene `dashboard:full` ni `pyg:read`. Se aplica en servidor (la UI solo oculta) |
| Dinero | `Decimal(14,2)`, `amount` siempre positivo; el signo lo da `type` | Evita errores de signo; transferencias usan `transferAccountId` |
| Flujo de caja vs devengo | `date` (devengo) + `paidAt` (caja) + `status` PAID/PENDING | Alimenta el selector "Pagado vs Por pagar / Cobrado vs Por cobrar" |
| PyG | `Category.pygLine` + `Reservation.platformCommission` | El PyG es un `GROUP BY` sobre `pygLine`; ver `src/lib/finance/pyg.ts` (función pura, testeable) |
| EBITDA | CAPEX (`pygLine = CAPEX`) queda fuera | Es inversión, no operación |
| Archivos | Cloudflare R2 privado, subida directa con URL prefirmada | No pasa por el servidor de Railway (sin límite de body ni costo de egress) |
| OCR | Interfaz `OcrProvider`; default Claude (visión, JSON validado con zod) | Maneja facturas colombianas, PDFs y sugiere categoría en una sola llamada. Intercambiable (Google Document AI) |

Supuestos a confirmar con el cliente: (a) el ingreso bruto del PyG = noches + tarifa de aseo cobrada; (b) la comisión de Airbnb se registra en la reserva, no como gasto; (c) `Budget` con `propertyId` nulo no es único en Postgres (NULLs distintos) — usar un `propertyId` siempre, o un índice parcial en una migración SQL.

## 2. Estructura de carpetas (Next.js 14 App Router)

```
.
├── prisma/
│   ├── schema.prisma
│   ├── migrations/            # versionadas en git; se aplican con `migrate deploy`
│   └── seed.ts                # categorías por defecto por WorkspaceType
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (app)/
│   │   │   ├── layout.tsx                      # shell + selector de workspace
│   │   │   └── w/[workspaceId]/
│   │   │       ├── page.tsx                    # Dashboard general
│   │   │       ├── transactions/               # lista + filtros
│   │   │       ├── expenses/new/               # formulario + dropzone OCR
│   │   │       ├── accounts/  wishlist/  settings/members/
│   │   │       └── airbnb/                     # solo si workspace.type = AIRBNB
│   │   │           ├── capex/                  # checklist interactivo
│   │   │           ├── pyg/                    # Estado de resultados (ADMIN)
│   │   │           ├── reservations/  fixed-expenses/  properties/
│   │   └── api/
│   │       ├── health/route.ts                 # healthcheck de Railway
│   │       └── auth/[...nextauth]/route.ts
│   ├── modules/                                # lógica por tipo de negocio
│   │   ├── core/        (accounts, transactions, categories, budgets, wishlist)
│   │   │   ├── actions.ts      # Server Actions ("use server"), validan con zod + requireWorkspace
│   │   │   ├── queries.ts      # lecturas (RSC), siempre con workspaceId
│   │   │   └── schemas.ts      # zod compartido cliente/servidor
│   │   ├── airbnb/      (capex, reservations, fixed-expenses, pyg)
│   │   ├── personal/    (futuro)
│   │   └── gig/         (futuro: Indriver, ingresos por turno)
│   ├── components/
│   │   ├── ui/                  # primitivas (shadcn/ui): button, table, dialog...
│   │   ├── charts/  kpi-card.tsx  month-filter.tsx  status-toggle.tsx
│   │   └── receipt-dropzone.tsx
│   └── lib/
│       ├── db.ts                # singleton PrismaClient
│       ├── auth/ {config.ts, permissions.ts}
│       ├── finance/pyg.ts       # cálculos puros (+ pyg.test.ts)
│       ├── ocr/ {types.ts, index.ts, providers/claude.ts}
│       └── storage/r2.ts        # URLs prefirmadas
├── Dockerfile  railway.json  next.config.mjs  .env.example
└── .github/workflows/ci.yml
```

Regla de capas: `app/` solo compone UI y llama a `modules/*`; `modules/*` es el único que habla con Prisma; `lib/` no conoce de negocio.

### Flujo OCR (formulario de gastos)

1. Dropzone → Server Action `createReceiptUpload(workspaceId, mime, size)` → `{key, url}`.
2. El navegador hace `PUT` directo a R2 (configurar CORS del bucket con el dominio de la app).
3. Server Action `processReceipt(key)`: crea `Attachment(ocrStatus=PROCESSING)`, lee de R2, llama `getOcrProvider().extract()`, guarda `rawOcrData`, devuelve `{vendor, date, total, suggestedCategory}`.
4. El formulario se autocompleta; el usuario corrige y guarda → se crea `Transaction` y se enlaza `Attachment.transactionId`.
5. Job de limpieza: adjuntos sin `transactionId` con más de 24 h se borran de R2 y de la BD.

## 3. Despliegue en Railway

### 3.1 Servicios
1. **New Project → Deploy from GitHub repo** (`valeriaflorezs/mibolsillo`). Railway detecta `railway.json` y construye con el `Dockerfile`.
2. **New → Database → PostgreSQL**. En el servicio web, variable `DATABASE_URL = ${{Postgres.DATABASE_URL}}` (red privada).
3. **Settings → Networking → Generate Domain** (o dominio propio).
4. **Settings → Source → Wait for CI** activado: Railway solo despliega si `ci.yml` pasa.

### 3.2 Build y migraciones
- `next.config.mjs` usa `output: "standalone"` → imagen final pequeña (`node server.js`).
- El `CMD` del Dockerfile ejecuta `prisma migrate deploy` antes de iniciar la app; si falla, el contenedor termina con el error en los logs y la versión anterior sigue viva.
- Flujo de migraciones: local `npm run db:migrate -- --name cambio` → commit de `prisma/migrations/*` → push. **Nunca** `migrate dev` ni `db push` contra Railway.
- Cambios destructivos: patrón expand → deploy → contract en dos releases.
- La migración inicial (`0001_init`) ya está generada desde el schema.

### 3.3 Variables de entorno (servicio web)

| Variable | Valor en Railway |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `AUTH_SECRET` | `openssl rand -base64 32` (distinto por entorno) |
| `AUTH_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | consola de Google Cloud |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | token R2 limitado al bucket |
| `OCR_PROVIDER`, `OCR_MODEL`, `ANTHROPIC_API_KEY` | según proveedor |

Usa **variables compartidas / de entorno** de Railway; nunca commitees `.env`.

### 3.4 Archivos adjuntos: Cloudflare R2
- Bucket **privado** `mibolsillo-receipts`; token API con permiso Object Read & Write solo a ese bucket.
- Claves: `ws/{workspaceId}/receipts/{yyyy}/{mm}/{uuid}.{ext}`. Antes de firmar una lectura, verificar con `requireWorkspace` que el `Attachment` pertenece al workspace del usuario.
- Lectura: URL prefirmada de 10 min (`signedReadUrl`).
- CORS del bucket: `PUT, GET` desde `https://<tu-dominio>` y `http://localhost:3000`.
- Alternativa: Supabase Storage (mismo patrón con signed URLs); basta reemplazar `lib/storage/r2.ts`.

### 3.5 CI/CD desde GitHub
- **PR** → `ci.yml` (validate, migrate en Postgres efímero, lint, typecheck, tests, build). Railway PR Environments (opcional) crea un entorno con BD propia por PR.
- **`staging`** → entorno Railway `staging` (BD separada).
- **`main`** → entorno `production`. Protege `main` (revisión + CI obligatorios).
- Rollback: Railway → Deployments → Redeploy de la versión anterior (las migraciones deben ser compatibles hacia atrás).
- Backups: activar backups programados del volumen de Postgres y probar un restore antes del lanzamiento.

## 4. Plan paso a paso del MVP (Airbnb)

| Fase | Entregable | Criterio de salida |
|---|---|---|
| 0. Fundaciones (2–3 d) | `create-next-app`, Tailwind, shadcn/ui, Prisma, deploy "hello world" en Railway con `/api/health`, CI verde | URL pública con BD conectada |
| 1. Auth y tenancy (3–4 d) | Login Google/magic link, crear workspace (tipo AIRBNB), invitar miembros, `requireWorkspace`, selector de workspace, seed de categorías con `pygLine` | Dos usuarios en workspaces distintos no se ven; OPERATOR bloqueado en rutas ADMIN (tests) |
| 2. Core de gastos (4–5 d) | Cuentas, categorías, transacciones CRUD, filtros por mes/estado PAID-PENDING | Saldo por cuenta correcto, incluidas transferencias |
| 3. CAPEX (3 d) | Propiedades, tabla checklist (marcar comprado, precio real, variación automática, totales) | Variación = presupuestado − real; al marcar comprado puede crear la `Transaction` |
| 4. Reservas y OPEX fijo (3–4 d) | Reservas (comisión, aseo, estado de cobro), gastos fijos recurrentes + generación mensual de transacciones PENDING | Cobrado vs por cobrar visible |
| 5. PyG y Dashboard (4 d) | `buildPyg` con tests unitarios, pantalla PyG, KPIs: flujo de caja, margen de contribución, EBITDA, ejecución de presupuesto (`Budget`) | Cifras cuadran con la hoja de cálculo actual del cliente |
| 6. Comprobantes + OCR (4–5 d) | R2 + dropzone + `processReceipt` + autocompletado + guardado de `Attachment` | ≥ 85 % de campos correctos en 30 facturas reales; fallback manual siempre disponible |
| 7. Endurecimiento (3 d) | Rate-limit en OCR, límites de tamaño, auditoría de permisos, backups, monitoreo, UAT con el cliente | Checklist de seguridad y restore de backup probado |

Total estimado: ~4–5 semanas para una persona. Postergar a post-MVP: módulos PERSONAL/GIG_ECONOMY, importación de extractos bancarios, multi-moneda, app móvil/PWA offline.

### Riesgos
- **Fuga entre tenants**: centralizar acceso en `modules/*`, tests de aislamiento, y valorar RLS de Postgres como segunda barrera.
- **EBITDA visible a OPERATOR**: nunca calcular KPIs sensibles en componentes cliente; las queries de `dashboard:full`/`pyg:read` validan permiso en servidor.
- **Costo/precisión OCR**: usar el modelo pequeño, limitar tamaño y reintentos, y exigir siempre confirmación humana.

## 5. Estado y cambios respecto al diseño inicial (2026-10-23)
- MVP construido (fases 0–4). Se usa **Next.js 16, Prisma 7 y Node 22** (versiones sin avisos críticos de `npm audit`).
- **Sesiones JWT** sin adaptador de Prisma: el modelo `AuthAccount` y las tablas de sesión quedaron sin uso.
- Las rutas reales cuelgan de `/w/[workspaceId]` y la lógica está en `src/modules/{core,airbnb}`.
- Fuera del MVP: RLS en Postgres, paginación, módulos Personal/Gig avanzados, importación de extractos, CSP con nonces.
