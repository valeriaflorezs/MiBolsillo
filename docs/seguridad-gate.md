# Gate de seguridad (protocolo-implementacion-web) — v2.0, 2026-10-23

**Stack:** Next.js 16 (App Router) + Prisma 7/PostgreSQL + Auth.js v5 (Google, sesión JWT) + Cloudflare R2, desplegado en Railway (Docker).
Evidencia de detección: `next.config.mjs`, `prisma/schema.prisma`, `Dockerfile`, `railway.json`.
Carga en lote: el `.xlsx` se lee en el navegador (el servidor nunca procesa archivos Excel); el servidor recibe solo texto, lo valida fila por fila con límites (500 filas, 12 columnas, 400 caracteres por celda), exige permiso (ADMIN) y aplica `rateLimit`. Dependencias: `read-excel-file` (sin vulnerabilidades conocidas) y `zod` 4.6.7 (corrige la advertencia de severidad alta sobre colecciones sobredimensionadas).

Cuentas y deudas (cuentas, tarjetas, créditos): lectura con `finance:read`, escritura solo ADMIN (`dashboard:full`); todo `loanId`/`paymentId`/`allocationId`/`cardId`/`fromAccountId` se verifica contra el workspace del usuario; pagar una tarjeta solo acepta cuentas propias que no sean tarjeta.

Login: Google para dueños/operadores; usuario y contraseña únicamente para cuentas de solo lectura (rol VIEWER) creadas por un ADMIN. Limitación: restablecer la contraseña no cierra las sesiones ya abiertas (JWT, 14 días); quitar al miembro sí corta el acceso al instante.

| # | Punto | Estado | Evidencia o razón |
|---|---|---|---|
| 1 | Claves API ocultas | Cumple | Solo `process.env.*`; `.env.example` sin valores |
| 2 | Secretos fuera de Git | Cumple | `.env*` en `.gitignore`/`.dockerignore`; repo nuevo sin secretos en historial |
| 3 | Clave pública de DB en cliente | No aplica | El navegador nunca habla con Postgres; ninguna variable `NEXT_PUBLIC_` es secreta |
| 4 | RLS | **Falta (riesgo asumido)** | Prisma usa un único rol de BD. Aislamiento por `workspaceId` en cada query + `requireWorkspace` + test de aislamiento (`queries.int.test.ts`). RLS como segunda barrera: post-MVP |
| 5 | Cifrado | Parcial | Tránsito: HTTPS (Railway) y TLS a R2/Anthropic. Reposo: R2 cifra por defecto; confirmar cifrado de volumen de Postgres en Railway |
| 6 | Autenticación en servidor | Cumple | `requireWorkspace` en toda Server Action; `pageCtx` en toda página; `/api/health` es el único endpoint público |
| 7 | Acceso por registro (IDOR) | Cumple (verificado en navegador: edición ajena → 404, CSV del operador solo con lo suyo, comprobantes solo del autor u ADMIN) | Todo `findFirst/updateMany` filtra `workspaceId`; IDs relacionados verificados con `count` (`createTransactionAction`); OPERATOR limitado a sus gastos |
| 8 | Mass assignment | Cumple | zod con campos explícitos; `role`, `workspaceId`, `createdById` salen de la sesión/URL validada, nunca del formulario |
| 9 | Cookies de sesión | Pendiente de verificar en producción | Auth.js: HttpOnly, SameSite=Lax, Secure bajo HTTPS. Verificar con `curl -I` tras el deploy |
| 10 | Hash de contraseñas | Cumple | Solo cuentas de solo lectura (usuario/contraseña): scrypt con sal por usuario (`src/lib/auth/credentials.ts`), contraseña generada por el servidor (14 caracteres) y mostrada una vez; comparación a tiempo constante, también con usuario inexistente |
| 11 | Límite de intentos de login | Cumple | Login con contraseña: 8 intentos/15 min por usuario y 30 por IP (en memoria, una réplica). Google delegado. `rateLimit` en subidas, OCR, transacciones, invitaciones y creación de negocios |
| 12 | Anti-bots | No aplica | Sin formularios públicos; registro solo vía Google |
| 13 | Monitoreo de consultas | Parcial | Prisma parametriza (sin SQL concatenado); logs `warn/error`. Falta alerta de consultas lentas |
| 14 | Validación de entradas | Cumple | zod en todas las acciones; fechas/montos/enum acotados |
| 15 | XSS | Cumple | React escapa; regla ESLint `react/no-danger` en error; sin `dangerouslySetInnerHTML` |
| 16 | Subida de archivos | Cumple | Lista blanca MIME, máx. 8 MB, nombre UUID, bucket privado, **verificación por magic bytes** antes del OCR, limpieza de huérfanos a 24 h |
| 17 | Respuestas de API | Cumple | Movimientos paginados (20/pág.), CSV acotado a 5000 filas y con neutralización de fórmulas (`=`, `+`, `-`, `@`) |
| 18 | Cabeceras de seguridad | Cumple | CSP, HSTS, nosniff, frame-ancestors/X-Frame-Options, Referrer-Policy, Permissions-Policy (verificado con `curl -I` en local). CSP conserva `'unsafe-inline'` (mejora: nonces) |
| 19 | HTTPS | Cumple | Railway + HSTS |
| 20 | Dependencias | Cumple | `npm audit --audit-level=high` sin hallazgos altos/críticos; 3 moderados en Tailwind 3 (`postcss-selector-parser`); Dependabot semanal; CI falla si aparece uno alto |

## Riesgos asumidos / pendientes
- Punto 4 (RLS) y alertas de consultas lentas (13).
- `rateLimit` en memoria: válido con una sola réplica.
- Las facturas se envían a Anthropic para OCR: declarado en la política de privacidad.
- Puntos "No aplica" para revisar si cambia el login: 3, 10, 11, 12.

## Revisión previa a publicar (protocolo-revision-web, 23 puntos) — veredicto: **Aprobar con condiciones**
Jurisdicción asumida: Colombia (Ley 1581 de 2012, Ley 1480 de 2011).

| Área | Estado |
|---|---|
| 1 Privacidad, 2 Términos | Borradores en `/privacidad` y `/terminos`, enlazados en login y pie. **Bloqueante antes de publicar:** completar razón social/NIT/contacto y validar con un abogado |
| 3 Reembolsos | No aplica (no hay venta) |
| 4–6 Cookies/consentimiento | Solo cookies esenciales de sesión + preferencia de tema en localStorage; sin analítica ni publicidad → no requiere banner. Si se añade analítica, hay que añadir consentimiento previo |
| 5 Datos del negocio | Pendiente (placeholders en la política) |
| 7–9 Formularios | Sin casillas de marketing; solo se piden los campos necesarios |
| 8 Menores | Público adulto; declarar en términos |
| 10 SDKs de terceros | Google OAuth, Railway, R2, Anthropic: declarados. Sin Google Fonts (fuentes del sistema) |
| 11 Baja de correos | No aplica (la app no envía correos) |
| 12 Eliminación de datos | Cumple: “Eliminar negocio” borra BD y comprobantes en R2; eliminación de la cuenta de usuario por solicitud al correo de contacto |
| 13–15 Accesibilidad | `aria-label` en controles icono, etiquetas en formularios, foco visible, `prefers-reduced-motion`, tabla accesible del gráfico, contraste del acento naranja resuelto con `--brand-text`. **Pendiente:** auditoría con Lighthouse/axe en navegador y prueba de teclado completa |
| 16–19 Honestidad comercial | No aplica (sin reseñas, ofertas ni cobros) |
| 20 Licencias | Dependencias MIT/Apache; iconos Lucide (ISC); sin imágenes de terceros |
| 21 Licencia “maseMTRn” | **No verificado: licencia sin identificar** |
| 22 Manual de usuario | `docs/manual-usuario.md` v1.0 (sin capturas aún; prueba con una persona real pendiente) |
| 23 Manual de sistema | `docs/manual-sistema.md` v1.0 (sin secretos) |

## Actualización v2.0
- Nuevas superficies: edición/eliminación de movimientos, cuentas, categorías, propiedades, CAPEX, reservas y gastos fijos; exportación CSV; eliminación de cuenta de usuario. Todas pasan por zod + `requireWorkspace` + verificación de pertenencia.
- `deleteMyAccountAction` está limitado (3/h), exige escribir el correo y reasigna los registros a otro administrador o elimina el negocio y sus comprobantes en R2.
- `npm audit`: 0 altos/críticos (3 moderados en Tailwind 3). Pruebas: 15 pasan (unitarias + integración).
- Punto 12 (revisión): el flujo de eliminación de datos ya existe en la app (Mi cuenta) además del correo de contacto.


**Validación de entradas (numéricos y fechas).** Todo número del servidor pasa por `src/lib/validation.ts`: solo dígitos con punto/coma decimal; se rechazan vacío, texto mezclado (`12abc`), notación científica (`1e3`), hexadecimal (`0x10`) y separadores de miles; dinero 0–1e12 con máx. 2 decimales, cantidades > 0 con máx. 3, enteros y porcentajes con rango propio; las fechas deben existir y estar entre 2000 y 2100. Las cargas en lote (`parseMoney`, cantidades, días) aplican las mismas reglas por fila. Los mensajes de zod salen en español (`z.locales.es()`). El navegador refuerza con `min/max/step`, pero la autoridad es el servidor.


**Conciliación.** `reconcileAccountAction` exige `dashboard:full`, verifica que la cuenta sea del workspace, calcula la diferencia en el servidor (no confía en la diferencia del cliente), limita el ritmo (60/h) y registra un movimiento visible y auditable en una categoría fuera del PyG. `balancesFrom` (src/lib/finance/balances.ts) es la única fórmula de saldo.
