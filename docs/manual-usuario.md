# Manual de usuario — MiBolsillo
**Versión:** 2.0 · **Fecha:** 2026-10-23 · **Cambios:** 2.0 rediseño, edición/eliminación de todo, estadísticas, pendientes, categorías, exportación CSV y eliminación de cuenta . **Manual con capturas de pantalla:** `docs/MiBolsillo_Manual_de_usuario.pdf` (fuente HTML en `docs/manual-usuario/`).

## Qué es
Una aplicación web para llevar tus finanzas personales y las de tus negocios (por ejemplo, un apartamento en Airbnb). Funciona en el computador y en el celular. Solo necesitas un navegador y una cuenta de Google.

## Entrar
1. Abre la dirección de la aplicación y pulsa **Continuar con Google**.
2. La primera vez, crea tu **negocio**: escribe un nombre, elige el tipo (Airbnb, personal, freelance o conductor) y, si es Airbnb, el nombre del apartamento. La app te crea categorías y una cuenta “Efectivo” listas para usar.
3. Con el selector de arriba a la izquierda cambias entre tus negocios o creas otro.

## Roles
- **Administrador:** ve y hace todo, incluido el Estado de resultados, el presupuesto y las cuentas.
- **Operador:** registra gastos, insumos y facturas de aseo y marca compras del CAPEX. No ve ingresos, EBITDA ni PyG, y solo ve los gastos que él registró.

- **Solo lectura:** ve el resumen, movimientos, CAPEX, PyG y estadísticas, pero no puede agregar, editar ni borrar nada.

**Dar acceso de solo lectura con usuario y contraseña** (por ejemplo, a un familiar sin cuenta de Google): **Miembros → Dar acceso de solo lectura**. Escribe el nombre y elige un usuario; la app genera la contraseña y la muestra **una sola vez** (cópiala y compártela por un canal privado). La persona entra desde la pantalla de inicio, en «o con usuario y contraseña». Si la pierde, usa **Nueva contraseña**; para cortar el acceso, usa **Quitar**. Estas cuentas no pueden crear negocios propios.

**Carga en lote (editor tipo tabla).** En el menú, **Carga en lote** (solo administradores). Elige qué cargar: *Movimientos* (columnas Fecha, Tipo, Monto, Cantidad opcional, Proveedor, Descripción, Categoría, Cuenta y Estado), y en negocios Airbnb también *CAPEX* y *Gastos fijos*. Puedes:
- **Pegar desde Excel o Google Sheets:** copia las celdas (con o sin encabezados), haz clic en cualquier celda de la tabla y pega con Ctrl+V. En el celular usa «Pegar texto copiado de Excel».
- **Subir un `.xlsx` o `.csv`:** la app detecta la hoja y las columnas por sus encabezados, y muestra las categorías del Excel para que elijas cuáles traer. Nada se guarda todavía.
- **Editar como en una hoja:** Enter baja a la celda de abajo, × quita la fila.
Pulsa **Revisar** para validar sin guardar; las filas con problema se marcan en rojo con el motivo. **Guardar** es todo o nada: si una fila falla, no se guarda ninguna. Los ítems de CAPEX y gastos fijos que ya existen (mismo nombre) se omiten, así que puedes volver a cargar el mismo archivo sin duplicar. Máximo 500 filas por carga.

**Cuentas y deudas.** Un solo módulo en **Más → Cuentas y deudas** (lo ve todo el equipo con acceso al resumen; solo el administrador edita). Arriba muestra cuatro cifras: *Dinero en cuentas*, *Deuda en tarjetas*, *Saldo de créditos* y *Posición neta* (dinero menos deudas). Tiene tres pestañas:
- **Cuentas:** efectivo, bancos y billeteras, con su saldo. Edita nombre, tipo y saldo inicial, o archiva una cuenta.
- **Tarjetas de crédito:** cada tarjeta muestra la **deuda**, el **cupo disponible** y el % usado, el **próximo corte**, la **fecha límite de pago** (con los días que faltan), las compras desde el último corte, los cargos mensuales y los intereses estimados de un mes si no pagas. Para crearla: nombre, cupo, deuda actual, día de corte, día de pago, tasa, **cuota de manejo** y **seguro**. Tus compras con la tarjeta se registran como gastos eligiéndola como cuenta. **Pagar la tarjeta** registra una transferencia desde tu banco (baja la deuda y baja ese banco). **Cargar cuota de manejo, seguro e intereses** suma esos cargos del mes como gastos financieros (no entran al EBITDA) y no se duplican si repites el mes.
- **Créditos** (antes «Deuda bancaria»): Crea el crédito con monto, banco, tasa (E.A. o mensual), plazo en meses, fecha de la primera cuota y, si la tienes, la cuota que cobra el banco (si no, se calcula con cuota fija). La pantalla muestra:
- **Saldo pendiente**, % del capital pagado y cuotas pagadas (de las del plan), con aviso de cuotas atrasadas.
- **Próxima cuota**, intereses pagados vs. previstos, total pagado y **fecha estimada de fin** (se recalcula si haces abonos extra).
- **Plan de pagos** con gráfica de capital e intereses por cuota y tabla de amortización.
- **Seguro y cuota de manejo**: en los datos del crédito puedes escribir el **seguro mensual** (el que cobran los bancos) y la **cuota de manejo mensual** (tarjetas de crédito). No amortizan la deuda: se suman a cada cuota y la pantalla muestra la cuota total, cuánto llevas pagado en seguro/manejo y cuánto falta. Para una tarjeta, crea un crédito con su deuda, tasa y plazo (o cuota) y llena estos campos.
- **Pagos**: registra cada cuota o **abono extra a capital**. Al registrar una cuota, el campo «Seguro y cuota de manejo incluidos en el pago» viene con los valores actuales; ese valor queda guardado en el pago, así que cambiarlo después no altera pagos anteriores. Si no indicas los intereses del extracto, se calculan (saldo × tasa mensual); si los sabes, escríbelos para que cuadre con el banco.
- **Destino del crédito**: a dónde fue el dinero (inversión Airbnb, tarjetas, ahorro…), con su porcentaje del crédito. Avisa si la suma supera el monto o si queda algo sin asignar. Puedes pegarlo desde Excel en **Carga en lote → Destino del crédito**.
Nota: los pagos del crédito no descuentan de tus cuentas ni entran al PyG; es un seguimiento de la deuda. Si quieres reflejarlos en una cuenta, regístralos además como movimiento.

Para invitar a alguien: **Miembros → Invitar**. Copia el enlace y envíaselo; solo sirve para el correo de Google que invitaste y vence en 7 días.

## Registrar un gasto con foto de la factura
1. Pulsa **+ Gasto**.
2. Arrastra la factura (JPG, PNG, WebP o PDF de hasta 8 MB) o pulsa **Elegir archivo**. En el celular puedes tomar la foto.
3. La app lee el comprobante y sugiere monto, fecha, proveedor y categoría. **Revisa siempre los datos** y corrígelos si hace falta.
4. Elige la cuenta, el estado (**Pagado** o **Por pagar**) y pulsa **Guardar**. Si compraste varias unidades, escribe la **Cantidad** (opcional): el monto sigue siendo el total y en el detalle verás el valor por unidad.
Si la lectura falla, puedes llenar el formulario a mano.

## Resumen (Administrador)
Muestra flujo de caja, margen de contribución, EBITDA operativo y ejecución del presupuesto del mes. Usa las flechas para cambiar de mes y el selector **Pagado / Por pagar / Todo** para ver lo ya pagado o cobrado, lo pendiente, o ambos.

## CAPEX (compras de adecuación)
Lista de lo que compras para dejar listo el apartamento. Escribe el **precio real** y pulsa **Comprado ✓**; la variación (presupuestado − real) se calcula sola: verde es ahorro, rojo es sobrecosto. **Deshacer** revierte la compra.

## Gastos fijos (Administrador)
- **Gastos fijos:** crea administración, servicios y suscripciones una vez. Cada mes pulsa **Generar gastos del mes** para crearlos como “Por pagar”; luego márcalos como pagados en **Gastos**.

## Estado de resultados (PyG)
Ingresos brutos → costos variables (comisiones, aseo, amenities) → margen de contribución → gastos fijos → EBITDA operativo. Las compras CAPEX no entran en el EBITDA.

## Si las cifras no cuadran con tu banco (Conciliar)
1. Ve a **Más → Cuentas y deudas → Cuentas** y abre **¿Cómo se calcula? · Conciliar** en la cuenta. Verás el saldo desglosado: saldo inicial + ingresos pagados − gastos pagados + transferencias recibidas − enviadas. Los movimientos «por pagar/por cobrar» no cuentan hasta que se marquen como pagados.
2. Revisa lo más común: **saldo inicial** mal puesto (debe ser el saldo real el día que empezaste), movimientos **repetidos** (la sección *Posibles movimientos repetidos* los lista), movimientos sin marcar como pagados o transferencias registradas como gasto/ingreso.
3. Si quieres dejarlo igual al banco, escribe el **saldo real hoy** y pulsa **Ajustar al saldo real**: se registra la diferencia como un *ajuste de saldo* que no cuenta como venta ni gasto del negocio. En una tarjeta usa **Conciliar con el extracto del banco** y escribe la deuda real.
4. Un **desembolso de crédito** (el dinero que te presta el banco) debe registrarse como ingreso con la categoría **Desembolso de crédito**: así entra a tu cuenta y al flujo de caja, pero **no se cuenta como venta** en Ingresos, EBITDA ni Estadísticas. Si ya lo tenías en «Otros ingresos», edítalo y cámbiale la categoría.
5. El **Saldo total en cuentas** del Resumen suma solo el dinero (efectivo, bancos, billeteras); la deuda de las tarjetas aparece aparte como «Tarjetas: debes…».

## Botón «i» (cómo se calcula)
Junto a cada cifra calculada hay un círculo pequeño con una **i**. Púlsalo (o enter con el teclado) para ver la fórmula en palabras; se cierra con Esc o tocando fuera.

## Preguntas frecuentes
- **Me dice «Monto inválido».** Escribe solo números, sin puntos de miles ni letras (por ejemplo `1500000`). Puedes usar punto o coma para los decimales (`12500.50` o `12500,50`), con máximo 2 decimales en dinero y 3 en cantidades. Las cantidades, tasas, días y plazos también deben ser números (los días y plazos, enteros). Las fechas deben existir (no 31 de febrero).
- **Me dice “No tienes permiso”:** tu rol no permite esa acción; pídele al administrador.
- **La invitación no funciona:** inicia sesión con el mismo correo al que se envió y verifica que no haya vencido.
- **Mis datos:** puedes eliminar un negocio completo en **Miembros → Eliminar este negocio**. Para eliminar tu cuenta o ejercer otros derechos, escribe al correo de la política de privacidad.

## Soporte
`<CORREO_DE_SOPORTE>`

## Novedades de la versión 2.0
- **Navegación:** en el computador, un **menú lateral izquierdo** que muestra solo iconos y se despliega con los nombres al acercar el cursor (también al navegar con el teclado); arriba quedan el selector de negocio, el botón **+ Movimiento**, los pendientes y tu avatar. En el celular, la barra inferior con el botón **+**. El menú de tu avatar cambia el tema claro/oscuro y cierra sesión.
- **Movimientos:** en las listas, el resumen y los pendientes cada movimiento se muestra con su **nota** (qué compraste) como título y el proveedor al lado; si no tiene nota, se muestra el proveedor. Busca por proveedor o nota, filtra por categoría, cuenta, estado y tipo, y pasa de página. Toca un movimiento para ver el detalle, abrir su comprobante, **editarlo** o **eliminarlo**. **Exportar CSV** descarga la lista filtrada.
  El Operador puede editar o eliminar sus propios gastos durante las 48 horas siguientes a registrarlos.
- **Filtro de categorías (Resumen y Estadísticas):** el mismo filtro está en el Resumen: ahí también afecta el flujo de caja, el anillo, el margen, el EBITDA, los principales gastos, los últimos 6 meses, el presupuesto, la actividad reciente y lo por pagar. El saldo de las cuentas no se filtra (es dinero real).
- **Filtro de categorías en Estadísticas:** pulsa **Categorías** y marca las que quieres ver; las que desmarques (por ejemplo gastos personales o de un familiar) no cuentan en ninguna cifra, gráfica ni lista de proveedores. Hay atajos *Todas*, *Ninguna* e *Invertir*, y puedes marcar «Recordar esta selección en este navegador». **Quitar filtro** vuelve a la vista completa.
- **Estadísticas (Administrador):** elige Hoy, Semana, Mes o Año; compara con el periodo anterior, mira los gastos por categoría y los mayores proveedores.
- **Pendientes (campana):** lo que debes pagar (con los vencidos marcados) y lo que te deben; márcalos como pagados o cobrados desde ahí.
- **Airbnb:** las reservas se llevan en la app de Airbnb; aquí registras el ingreso como un movimiento cuando te pagan. En **Propiedades** administras tus apartamentos.
- **Categorías (Administrador):** crea y edita categorías; la “línea del PyG” decide dónde suma cada gasto en el estado de resultados.
- **Presupuesto:** copia el presupuesto del mes anterior con un clic.
- **Mi cuenta (avatar → Mi cuenta y privacidad):** ver tus negocios y **eliminar tu cuenta**. Si eres el único administrador de un negocio, ese negocio se elimina con todo; si hay otro administrador, los registros pasan a esa persona.

## Importar datos desde un archivo (Administrador, Airbnb)
En **CAPEX** y en **Gastos fijos** hay un panel “Importar desde CSV / Excel”. Prepara tu hoja de cálculo con estas columnas en la primera fila, guárdala como **CSV** y súbela eligiendo la propiedad:
- **CAPEX:** `categoria, descripcion, cantidad, precio_unitario_presupuestado, precio_unitario_real, tienda`. Si pones precio real, el ítem queda como *comprado*.
- **Gastos fijos:** `nombre, concepto, monto, frecuencia, dia`.
Los ítems que ya existen no se duplican y la app te indica las filas con errores.
