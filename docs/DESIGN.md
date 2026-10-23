# Dirección de diseño — basada en "Dashboard V14" (referencia en video)

## Lo que se observa en la referencia
- **Shell:** barra superior flotante con logo, pestañas en píldora (Overview, Activity, Manage…), búsqueda, notificaciones y avatar; **rail lateral** de iconos con selector claro/oscuro.
- **Superficies:** fondo gris-lavanda claro, tarjetas blancas muy redondeadas (~20 px), sombra suave, mucho aire.
- **Color:** neutro + **un solo acento naranja** (barra destacada, anillos, interruptores, "Add money"). Positivos en verde sutil. Botón primario negro en píldora.
- **Datos:** cifra grande + delta en chip verde; barras mensuales con el último mes resaltado; anillos de progreso con % y meta; toggles para reglas automáticas; tarjetas de contacto con avatar de iniciales en degradé.
- **Interacción:** hover con elevación (`whileHover y:-5`), skeleton/blur al cargar. Stack de la demo: Tailwind + framer-motion + lucide-react.

## Mapeo a MiBolsillo
| Referencia | Pantalla nuestra |
|---|---|
| Tarjeta de cifra + delta | KPIs: flujo de caja, margen de contribución, EBITDA (solo ADMIN) |
| Barras mensuales con mes actual en naranja | Ingresos vs gastos por mes; ejecución del presupuesto |
| Anillos de progreso con meta | Checklist CAPEX (% comprado) y "Wishlist" |
| Tarjetas de "Savings & Goals" | Una tarjeta por Workspace/propiedad en el selector |
| Toggles "Auto-save" | Gastos fijos recurrentes (activar/pausar) |
| Pestañas en píldora | Resumen · Transacciones · CAPEX · PyG · Reservas |
| Tarjetas "Contacts" | Cuentas (Nequi, bancos) |
| Switch claro/oscuro | Tema con `data-theme` (tokens en `globals.css`) |

## Reglas de accesibilidad (protocolo-revision, puntos 13–15)
- El naranja de marca (`--brand`) no llega a 4.5:1 como texto: úsalo en rellenos y gráficos; el texto de acento usa `--brand-text`.
- Gráficos: etiqueta con texto/valor, no solo color (barra resaltada también lleva etiqueta); tablas alternativas accesibles.
- Foco visible, navegación por teclado en pestañas, rail y toggles (`role="switch"`), `prefers-reduced-motion` respetado.
- Iconos-botón con `aria-label`.

## Implementación
Tokens en `tailwind.config.ts` y `src/app/globals.css`. Dependencias a añadir: `framer-motion`, `lucide-react`. Componentes base por construir en `src/components/ui`: `Card`, `KpiCard`, `PillTabs`, `Switch`, `ProgressRing`, `BarChart` (SVG propio, ligero y accesible), `Avatar`.
