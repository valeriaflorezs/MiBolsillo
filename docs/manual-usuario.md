# Manual de usuario — MiBolsillo
**Versión:** 2.0 · **Fecha:** 2026-10-23 · **Cambios:** 2.0 rediseño, edición/eliminación de todo, estadísticas, pendientes, categorías, exportación CSV y eliminación de cuenta (pendiente añadir capturas).

## Qué es
Una aplicación web para llevar tus finanzas personales y las de tus negocios (por ejemplo, un apartamento en Airbnb). Funciona en el computador y en el celular. Solo necesitas un navegador y una cuenta de Google.

## Entrar
1. Abre la dirección de la aplicación y pulsa **Continuar con Google**.
2. La primera vez, crea tu **negocio**: escribe un nombre, elige el tipo (Airbnb, personal, freelance o conductor) y, si es Airbnb, el nombre del apartamento. La app te crea categorías y una cuenta “Efectivo” listas para usar.
3. Con el selector de arriba a la izquierda cambias entre tus negocios o creas otro.

## Roles
- **Administrador:** ve y hace todo, incluido el Estado de resultados, el presupuesto, las cuentas y las reservas.
- **Operador:** registra gastos, insumos y facturas de aseo y marca compras del CAPEX. No ve ingresos, EBITDA ni PyG, y solo ve los gastos que él registró.

Para invitar a alguien: **Miembros → Invitar**. Copia el enlace y envíaselo; solo sirve para el correo de Google que invitaste y vence en 7 días.

## Registrar un gasto con foto de la factura
1. Pulsa **+ Gasto**.
2. Arrastra la factura (JPG, PNG, WebP o PDF de hasta 8 MB) o pulsa **Elegir archivo**. En el celular puedes tomar la foto.
3. La app lee el comprobante y sugiere monto, fecha, proveedor y categoría. **Revisa siempre los datos** y corrígelos si hace falta.
4. Elige la cuenta, el estado (**Pagado** o **Por pagar**) y pulsa **Guardar**.
Si la lectura falla, puedes llenar el formulario a mano.

## Resumen (Administrador)
Muestra flujo de caja, margen de contribución, EBITDA operativo y ejecución del presupuesto del mes. Usa las flechas para cambiar de mes y el selector **Pagado / Por pagar / Todo** para ver lo ya pagado o cobrado, lo pendiente, o ambos.

## CAPEX (compras de adecuación)
Lista de lo que compras para dejar listo el apartamento. Escribe el **precio real** y pulsa **Comprado ✓**; la variación (presupuestado − real) se calcula sola: verde es ahorro, rojo es sobrecosto. **Deshacer** revierte la compra.

## Reservas y gastos fijos (Administrador)
- **Reservas:** registra entrada, salida, ingreso, tarifa de aseo y comisión. Marca **Cobrada** cuando llegue el pago.
- **Gastos fijos:** crea administración, servicios y suscripciones una vez. Cada mes pulsa **Generar gastos del mes** para crearlos como “Por pagar”; luego márcalos como pagados en **Gastos**.

## Estado de resultados (PyG)
Ingresos brutos → costos variables (comisiones, aseo, amenities) → margen de contribución → gastos fijos → EBITDA operativo. Las compras CAPEX no entran en el EBITDA.

## Preguntas frecuentes
- **Me dice “No tienes permiso”:** tu rol no permite esa acción; pídele al administrador.
- **La invitación no funciona:** inicia sesión con el mismo correo al que se envió y verifica que no haya vencido.
- **Mis datos:** puedes eliminar un negocio completo en **Miembros → Eliminar este negocio**. Para eliminar tu cuenta o ejercer otros derechos, escribe al correo de la política de privacidad.

## Soporte
`<CORREO_DE_SOPORTE>`

## Novedades de la versión 2.0
- **Navegación:** en el computador, la barra superior (con el menú **Más**); en el celular, la barra inferior con el botón **+** para registrar un movimiento. El menú de tu avatar cambia el tema claro/oscuro y cierra sesión.
- **Movimientos:** busca por proveedor o nota, filtra por categoría, cuenta, estado y tipo, y pasa de página. Toca un movimiento para ver el detalle, abrir su comprobante, **editarlo** o **eliminarlo**. **Exportar CSV** descarga la lista filtrada.
  El Operador puede editar o eliminar sus propios gastos durante las 48 horas siguientes a registrarlos.
- **Estadísticas (Administrador):** elige Hoy, Semana, Mes o Año; compara con el periodo anterior, mira los gastos por categoría y los mayores proveedores.
- **Pendientes (campana):** lo que debes pagar (con los vencidos marcados) y lo que te deben; márcalos como pagados o cobrados desde ahí.
- **Airbnb:** el resumen muestra ocupación, tarifa media por noche (ADR) y RevPAR. En **Reservas** ves el detalle con el neto para ti; en **Propiedades** administras tus apartamentos.
- **Categorías (Administrador):** crea y edita categorías; la “línea del PyG” decide dónde suma cada gasto en el estado de resultados.
- **Cuentas:** edita nombre, tipo y saldo inicial, o archiva una cuenta.
- **Presupuesto:** copia el presupuesto del mes anterior con un clic.
- **Mi cuenta (avatar → Mi cuenta y privacidad):** ver tus negocios y **eliminar tu cuenta**. Si eres el único administrador de un negocio, ese negocio se elimina con todo; si hay otro administrador, los registros pasan a esa persona.

## Importar datos desde un archivo (Administrador, Airbnb)
En **CAPEX** y en **Gastos fijos** hay un panel “Importar desde CSV / Excel”. Prepara tu hoja de cálculo con estas columnas en la primera fila, guárdala como **CSV** y súbela eligiendo la propiedad:
- **CAPEX:** `categoria, descripcion, cantidad, precio_unitario_presupuestado, precio_unitario_real, tienda`. Si pones precio real, el ítem queda como *comprado*.
- **Gastos fijos:** `nombre, concepto, monto, frecuencia, dia`.
Los ítems que ya existen no se duplican y la app te indica las filas con errores.
