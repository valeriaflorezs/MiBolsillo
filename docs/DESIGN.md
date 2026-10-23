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

## Actualización: fidelidad a la referencia
- **Fondo:** degradado de cielo a navy con luces difuminadas (ondas) en `body::before`.
- **Vidrio:** `.card` (claro, translúcido con desenfoque), `.panel` (navy translúcido), `.hero` (celeste → navy), `.glass-btn` y chips de contorno.
- **Carpetas:** `FolderCard` (pestaña a la izquierda con esquina cóncava, metadatos a la derecha) en detalle de movimientos y reservas, pendientes, próximas llegadas.
- **Gráficos:** anillo con etiquetas sobre el arco (`RingGauge`), barras apiladas con rejilla punteada y eje a la derecha (`StackedBars`), listas con avatares de iniciales.
- **Navegación móvil:** barra inferior de vidrio con botón central “+”.

## Navegación de escritorio (menú lateral)
`SideNav` (`src/components/shell/side-nav.tsx`): riel de iconos de vidrio navy fijo a la izquierda (4,75 rem) que se despliega a 16 rem **sobre** el contenido con `:hover` y `:focus-within`; todas las secciones (principales, “más”, pendientes y cuenta) con iconos de lucide. La barra superior solo contiene negocio, acción “+ Movimiento”, pendientes y avatar, con `z-40` para que sus menús queden por encima de las tarjetas. En móvil se mantiene la barra inferior.

## Marca
Logotipos en `public/brand/` (PNG con fondo transparente, generados de los originales): `logo-on-dark.png` y `mark-on-dark.png` para superficies navy; `logo-on-light.png` y `mark-on-light.png` para superficies claras. El componente `Logo` (`src/components/ui/logo.tsx`) elige la versión: `tone="onDark"` fijo para barras y paneles navy, `tone="auto"` según el tema. El menú lateral muestra la marca “Mi” plegado y el logotipo completo al desplegarse. Favicon e icono de iOS: `src/app/icon.png` y `apple-icon.png`.
