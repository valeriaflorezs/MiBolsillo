<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/logo-on-dark.png">
    <img src="public/brand/logo-on-light.png" alt="MiBolsillo" width="360">
  </picture>
</p>

# MiBolsillo

**Finanzas personales y control de emprendimientos en una sola aplicación web.**
Cada persona puede administrar varios *negocios* (por ejemplo “Airbnb Apto 302”, “Finanzas personales” o “Vehículo / Indriver”), cada uno con sus cuentas, categorías, presupuesto y equipo.

🔗 **Aplicación en producción (Railway):** <https://mibolsillo.up.railway.app>

## Qué hace

- **Multinegocio y roles.** Inicio de sesión con Google; *Administrador* (acceso total) y *Operador* (registra gastos, insumos y facturas de aseo, sin ver ingresos, EBITDA ni PyG).
- **Resumen financiero.** Saldo total, flujo de caja, margen de contribución, EBITDA operativo, ejecución del presupuesto, ingresos vs. gastos, gastos por categoría y filtros por mes y por estado (pagado / por pagar, cobrado / por cobrar).
- **Movimientos.** Gastos, ingresos y transferencias entre cuentas (Nequi, bancos, efectivo, tarjetas); búsqueda, filtros, paginación, edición, eliminación y exportación a CSV.
- **Facturas con OCR.** Arrastra una foto o PDF: la app lee monto, fecha y proveedor, sugiere la categoría y guarda el comprobante en un almacenamiento privado (Cloudflare R2).
- **Módulo Airbnb / alquiler corto.** Propiedades, checklist de inversión **CAPEX** (presupuestado vs. real), reservas con estado de cobro, gastos fijos recurrentes, **Estado de Resultados (PyG)** y KPIs de ocupación, tarifa media (ADR) y RevPAR.
- **Estadísticas** por día, semana, mes y año con comparación contra el periodo anterior, pendientes por pagar y por cobrar, presupuesto por categoría, lista de deseos.
- **Importación desde CSV/Excel** de ítems CAPEX y gastos fijos.
- **Privacidad.** Eliminación de negocios y de la cuenta del usuario (incluye los comprobantes almacenados).
- **Diseño responsivo** con tema claro y oscuro (vidrio translúcido, degradados y secciones en forma de carpeta).

## Tecnología

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS · Prisma 7 + PostgreSQL · Auth.js v5 (Google) · Cloudflare R2 · OCR con Claude (intercambiable) · despliegue con Docker en Railway.

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitectura, estructura de carpetas, despliegue y plan |
| [`docs/manual-usuario.md`](docs/manual-usuario.md) | Manual de usuario |
| [`docs/manual-sistema.md`](docs/manual-sistema.md) | Manual de sistema (instalación, variables, rutas, operación) |
| [`docs/seguridad-gate.md`](docs/seguridad-gate.md) | Controles de seguridad y revisión previa a publicar |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Dirección de diseño y tokens |

## Desarrollo local

```bash
cp .env.example .env          # completa DATABASE_URL, AUTH_SECRET, credenciales de Google…
npm install
npx prisma migrate dev        # crea las tablas
npx tsx scripts/demo-seed.ts  # (opcional) datos de ejemplo
npm run dev                   # http://localhost:3000
```

Calidad: `npm run lint && npm run typecheck && npm test` (las pruebas de integración usan `DATABASE_URL`).

## Despliegue

Railway construye la imagen del `Dockerfile` en cada push; al arrancar aplica las migraciones (`prisma migrate deploy`) y expone `/api/health`. Variables necesarias: ver [`.env.example`](.env.example) y el manual de sistema. No subas secretos al repositorio.
