# Dirección de diseño — referencia "Nexora" (azules + vidrio)

## Paleta (tokens en `src/app/globals.css`)
| Token | Claro | Uso |
|---|---|---|
| `canvas` / fondo | degradado celeste `#eaf3fd → #b9d5f2` | fondo de la app |
| `surface` | blanco al 72 % + desenfoque (vidrio) | tarjetas `.card` |
| `ink` | `#0b1b3a` | texto |
| `muted` | `#465a7c` (≥5:1) | texto secundario |
| `brand` | `#1d4e9c` | acciones primarias, selección |
| `accent` | `#7db4ee` | gráficos, botón “+ Movimiento”, resaltados (siempre con texto oscuro) |
| `panel` / `panel2` | `#0b2654` / `#163e7c` | paneles navy (`.panel`), barra superior |
| `positive` / `negative` | `#047857` / `#b91c1c` | deltas y alertas |

Tema oscuro: mismos nombres con valores navy profundo (`data-theme="dark"`), alternable desde el menú del avatar.

## Patrones
- **Barra superior navy** con selector de negocio, pestañas en píldora (activa = azul), menú “Más”, campana de pendientes y avatar.
- **Navegación inferior flotante en móvil** con botón central “+”.
- **Resumen:** panel de saldo (cuentas + accesos rápidos), KPIs con sparkline, ocupación/ADR/RevPAR (Airbnb), barras 6 meses, dona por categoría, actividad reciente.
- **Lista + detalle** (Movimientos y Reservas): lista navy a la izquierda, detalle en vidrio a la derecha.
- Gráficos con alternativa textual (tabla `sr-only`, leyendas con valores).

## Accesibilidad
Contraste ≥4.5:1 en texto; el celeste solo como relleno con texto oscuro; foco visible; `prefers-reduced-motion`; etiquetas en todos los controles; `aria-current` en navegación y listas.
