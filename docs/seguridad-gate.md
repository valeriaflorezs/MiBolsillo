# Gate de seguridad (protocolo-implementacion-web) — v0.1, 2026-10-23

**Stack:** Next.js 14 (App Router) + Prisma/PostgreSQL + Auth.js + Cloudflare R2, desplegado en Railway (Docker).
Evidencia de detección: `next.config.mjs`, `prisma/schema.prisma`, `Dockerfile`, `railway.json`.
Decisión del usuario (2026-10-23): login solo con Google en el MVP → puntos 10, 11 y 12 "No aplica" confirmados.
Estado: **esqueleto**. "Cumple" = presente en el código del repo; lo que depende de la app aún no construida figura como "Pendiente".

| # | Punto | Estado | Evidencia o razón |
|---|---|---|---|
| 1 | Claves API ocultas | Cumple | Solo `process.env.*` (`src/lib/storage/r2.ts`, `ocr/providers/claude.ts`); `.env.example` sin valores |
| 2 | Secretos fuera de Git | Cumple | `.env`/`.env.local` en `.gitignore` y `.dockerignore`; repo nuevo, sin historial previo. Falta correr `run_secret_scanning` antes de publicar |
| 3 | Clave pública de DB en cliente | No aplica | No hay SDK de BD en el cliente; el navegador nunca habla con Postgres. Ninguna variable `NEXT_PUBLIC_` es secreta |
| 4 | RLS | **Falta** (riesgo asumido para MVP) | Prisma usa un solo rol de BD, que no pasa por RLS. Aislamiento por `workspaceId` en código (`requireWorkspace`). Segunda barrera con RLS: fase 7 del plan |
| 5 | Cifrado | Pendiente | Tránsito: HTTPS de Railway y TLS de R2. Reposo: confirmar cifrado de volumen de Railway y de R2 (R2 cifra por defecto) |
| 6 | Autenticación en servidor | Cumple (patrón) | `requireWorkspace` en `receipt-actions.ts`; debe usarse en TODA acción nueva |
| 7 | Acceso por registro (IDOR) | Cumple (patrón) | `getReceiptUrlAction` filtra por `workspaceId` y `id`; claves R2 bajo `ws/{workspaceId}/` |
| 8 | Mass assignment | Cumple (patrón) | Esquemas zod con campos explícitos; `role`, `workspaceId`, `createdById` salen de la sesión, nunca del cliente |
| 9 | Cookies de sesión | Pendiente | Auth.js usa HttpOnly/SameSite y `Secure` bajo HTTPS; verificar con `curl -I` tras el primer deploy |
| 10 | Hash de contraseñas | No aplica | Login solo con Google OAuth en el MVP; `User.passwordHash` queda sin usar. Si se habilitan credenciales: argon2 |
| 11 | Límite de intentos de login | No aplica (MVP) | Delegado a Google. `rateLimit` ya protege la subida de comprobantes |
| 12 | Anti-bots | No aplica (MVP) | Sin formularios públicos; registro solo por OAuth. Añadir Turnstile si se abre un formulario público |
| 13 | Monitoreo de consultas | Parcial | Prisma parametriza; `log: ["warn","error"]` en `db.ts`. Falta alerta de consultas lentas (métricas de Railway) |
| 14 | Validación de entradas | Cumple (patrón) | zod en `receipt-actions.ts`; obligatorio por cada acción nueva |
| 15 | XSS | Cumple | React escapa por defecto; prohibido `dangerouslySetInnerHTML` (regla de lint a añadir) |
| 16 | Subida de archivos | Parcial | Lista blanca MIME, tamaño máximo, nombre aleatorio UUID y bucket privado. Falta verificar el tipo real (magic bytes) antes del OCR |
| 17 | Respuestas de API | Parcial | Acciones devuelven solo los campos necesarios; falta paginación en listados (se implementa con cada listado) |
| 18 | Cabeceras de seguridad | Cumple (config) | `next.config.mjs`: CSP, HSTS, nosniff, frame-ancestors/X-Frame-Options, Referrer-Policy. Verificar con `curl -I` en Railway. CSP aún usa `'unsafe-inline'` (mejora: nonce) |
| 19 | HTTPS | Cumple (por plataforma) | Railway redirige a HTTPS y HSTS está configurado; verificar tras el deploy |
| 20 | Dependencias | Cumple (config) | `npm audit --audit-level=high` en CI y `.github/dependabot.yml`. Aún no ejecutado: no existe `package-lock.json` |

## Riesgos asumidos / pendientes
- Punto 4 (RLS) sin implementar; mitigar con tests de aislamiento entre workspaces.
- `rateLimit` en memoria solo vale con una réplica.
- Puntos "No aplica" para revisar: 3, 10, 11, 12 (dependen de que el login siga siendo solo Google).
- Supuesto: el despliegue es una sola réplica web.

## Revisión previa a publicar (protocolo-revision-web)
Aún no ejecutable: no hay UI. Pendientes que ya conocemos: política de privacidad, términos y política de cookies (Ley 1581 de 2012; los datos financieros y las facturas son personales; validar textos con un abogado), banner de consentimiento si se añade analítica, accesibilidad WCAG AA (contraste, teclado, `alt`), inventario de terceros (Google OAuth, Anthropic API para OCR, Cloudflare R2 — declarar en la política que las facturas se envían al proveedor de OCR), flujo real de eliminación de datos (tablas + R2), y manuales de usuario y sistema vigentes.
