import type { Explain } from "@/components/ui/info-tip";

/** Explicaciones de «¿cómo se calcula?» (botón «i»). Una sola fuente para que Resumen, Estadísticas, PyG, etc. digan lo mismo. */
export const EXPLAIN = {
  // ── Resumen / Estadísticas / PyG ──
  balance: { title: "Saldo total en cuentas", lines: [
    "Suma del saldo de tus cuentas de dinero: efectivo, bancos, billeteras y fondos.",
    "Cada cuenta = saldo inicial + ingresos pagados − gastos pagados + transferencias recibidas − transferencias enviadas.",
    "Los movimientos «por pagar/por cobrar» no cuentan hasta que los marcas como pagados. La deuda de las tarjetas de crédito no se resta aquí: aparece aparte.",
  ] },
  vsPrevious: { title: "Comparación con el periodo anterior", lines: [
    "(Cifra de este periodo − cifra del periodo anterior) ÷ valor absoluto de la cifra del periodo anterior.",
    "Para los gastos, bajar es bueno (verde); para ingresos y resultado, subir es bueno. Sin cifra anterior no se puede comparar.",
  ] },
  ring: { title: "Anillo de ingresos", lines: [
    "Centro: ingresos del mes = noches y tarifa de aseo de las reservas + otros ingresos de la operación. No incluye desembolsos de crédito ni ajustes de saldo.",
    "Gastos = costos variables + gastos fijos (no incluye CAPEX ni intereses y cargos financieros). Resultado = ingresos − gastos.",
    "Margen = margen de contribución ÷ ingresos. EBITDA % = EBITDA ÷ ingresos.",
  ] },
  cashFlow: { title: "Flujo de caja", lines: [
    "Todo el dinero que entró en el periodo (reservas, ingresos y desembolsos) − todo lo que salió (gastos, comisiones y compras CAPEX).",
    "Respeta el filtro de estado (pagado/por pagar) y de categorías. Es dinero, no utilidad: por eso puede diferir del EBITDA.",
  ] },
  margin: { title: "Margen de contribución", lines: [
    "Ingresos − costos variables (comisiones de plataforma, aseo, amenities e insumos y otros costos variables).",
    "El porcentaje es margen ÷ ingresos: cuánto de cada peso vendido queda después de los costos que dependen de las ventas.",
  ] },
  ebitda: { title: "EBITDA operativo", lines: [
    "Margen de contribución − gastos fijos (administración, servicios, internet y apps, mantenimiento y otros fijos).",
    "No incluye CAPEX (compras de adecuación), intereses ni cargos financieros, ni ajustes de saldo.",
  ] },
  budgetExec: { title: "Ejecución del presupuesto", lines: [
    "Gastos del mes en las categorías que tienen presupuesto ÷ suma de esos presupuestos.",
    "Pasa del 100 % cuando gastas más de lo presupuestado. Las categorías sin presupuesto no entran en este porcentaje.",
  ] },
  occupancy: { title: "Ocupación", lines: [
    "Noches ocupadas del mes ÷ noches disponibles (días del mes × propiedades activas).",
    "Una reserva que cruza de mes se reparte por las noches que caen dentro de cada mes.",
  ] },
  adr: { title: "Tarifa media por noche (ADR)", lines: ["Ingreso por hospedaje del mes ÷ noches vendidas.", "El ingreso de reservas largas se prorratea por noche dentro del mes."] },
  revpar: { title: "RevPAR", lines: ["Ingreso por hospedaje del mes ÷ noches disponibles.", "Equivale a ocupación × tarifa media por noche."] },
  topExpenses: { title: "Principales gastos", lines: ["Gastos del periodo agrupados por categoría, de mayor a menor. El porcentaje es la parte de cada categoría sobre el total de gastos.", "Respeta el filtro de categorías."] },
  sixMonths: { title: "Últimos 6 meses", lines: ["Ingresos y gastos de cada uno de los últimos seis meses, con el mismo filtro de estado y categorías."] },
  statsIncome: { title: "Ingresos", lines: ["Ingresos de la operación del periodo: reservas (noches + aseo cobrado) y otros ingresos con categoría de venta.", "No cuenta desembolsos de crédito ni ajustes de saldo."] },
  statsExpense: { title: "Gastos", lines: ["Costos variables + gastos fijos del periodo (incluye comisiones de plataforma).", "No cuenta CAPEX ni cargos financieros."] },
  statsResult: { title: "Resultado", lines: ["Ingresos − Gastos del periodo, las dos cifras de arriba.", "No incluye CAPEX, desembolsos de crédito ni ajustes de saldo. Para el movimiento real de dinero mira el «Flujo de caja» del Resumen."] },
  donut: { title: "Gastos por categoría", lines: ["Suma de los gastos de cada categoría en el periodo; se muestran las 6 mayores y el resto como «Otros».", "El porcentaje es la categoría ÷ total de gastos del periodo."] },
  vendors: { title: "Mayores proveedores", lines: ["Suma de los gastos del periodo agrupados por proveedor (el nombre escrito en cada gasto). Se muestran los 5 mayores."] },
  pygRevenue: { title: "Ingresos brutos", lines: ["Noches + tarifa de aseo cobrada de las reservas (por fecha de entrada) + otros ingresos de la operación.", "Base devengo: cuenta lo pagado y lo pendiente."] },
  pygVariable: { title: "Costos variables", lines: ["Comisión de la plataforma de cada reserva + gastos de categorías de comisión, aseo, amenities y otros variables."] },
  pygMargin: { title: "Margen de contribución", lines: ["Ingresos brutos − costos variables.", "El % es cada renglón ÷ ingresos brutos."] },
  pygEbitda: { title: "EBITDA operativo", lines: ["Margen de contribución − gastos fijos (administración, servicios, internet, mantenimiento y otros fijos).", "CAPEX, intereses y ajustes quedan fuera."] },
  // ── CAPEX / Reservas ──
  capexBudget: { title: "Presupuesto total", lines: ["Suma de cantidad × precio unitario presupuestado de todos los ítems."] },
  capexSpent: { title: "Gastado (real)", lines: ["Suma de cantidad × precio unitario real de los ítems ya comprados."] },
  capexVariance: { title: "Variación", lines: ["Presupuestado − real, solo de lo ya comprado.", "Positivo (verde) = ahorro; negativo (rojo) = te pasaste del presupuesto."] },
  reservationNet: { title: "Neto para ti", lines: ["Noches + tarifa de aseo cobrada − comisión de la plataforma.", "Es lo que te queda de la reserva antes de tus costos de aseo y operación."] },
  reservationsMonth: { title: "Ingresos del mes y por cobrar", lines: ["Ingresos del mes = noches + aseo cobrado de las reservas con entrada este mes (sin canceladas).", "Por cobrar = esas mismas reservas aún no cobradas, menos la comisión de la plataforma."] },
  // ── Cuentas y deudas ──
  netPosition: { title: "Posición neta", lines: ["Dinero en cuentas − deuda en tarjetas − saldo de créditos.", "Es lo que te quedaría si pagaras hoy todas tus deudas con el dinero que tienes."] },
  moneyInAccounts: { title: "Dinero en cuentas", lines: ["Suma del saldo de efectivo, bancos, billeteras y fondos (sin tarjetas de crédito).", "Saldo de cada cuenta = saldo inicial + ingresos pagados − gastos pagados ± transferencias."] },
  cardDebtTotal: { title: "Deuda en tarjetas", lines: ["Suma de lo que debes en cada tarjeta: deuda inicial + compras + cargos − pagos. Un saldo a favor no se descuenta de otra tarjeta."] },
  loansBalance: { title: "Saldo de créditos", lines: ["Capital que aún debes en tus créditos: monto del crédito − capital ya pagado.", "En cada pago, primero se cubren intereses (saldo × tasa mensual) y el resto abona a capital."] },
  cardDebt: { title: "Deuda de la tarjeta", lines: ["Deuda inicial + compras con la tarjeta + cuota de manejo, seguro e intereses cargados − pagos hechos a la tarjeta."] },
  cardAvailable: { title: "Cupo disponible", lines: ["Cupo total − deuda actual (nunca baja de 0). El % usado es deuda ÷ cupo total."] },
  cardSinceCutoff: { title: "Compras desde el corte", lines: ["Suma de los gastos pagados con esta tarjeta desde el último día de corte hasta hoy (incluye cargos de manejo, seguro e intereses)."] },
  cardFees: { title: "Cargos mensuales", lines: ["Cuota de manejo mensual + seguro mensual de la tarjeta. No amortizan la deuda."] },
  cardInterest: { title: "Intereses si no pagas", lines: ["Deuda actual × tasa mensual. Si la tasa es efectiva anual: (1 + tasa)^(1/12) − 1.", "Es un estimado de un mes; el banco puede calcular por días y por saldo promedio."] },
  loanNextInstallment: { title: "Próxima cuota", lines: ["Cuota fija del plan (capital + intereses) + seguro y cuota de manejo mensuales si los registraste.", "Cuota fija = monto × tasa ÷ (1 − (1 + tasa)^−plazo), con la tasa mensual. Si el banco te informó la cuota, se usa esa."] },
  loanInterestPaid: { title: "Intereses pagados", lines: ["Suma de los intereses de tus pagos: los del extracto si los escribiste, o saldo × tasa mensual en cada cuota.", "«Previstos» = intereses de todas las cuotas del plan si pagas puntual."] },
  loanPaidTotal: { title: "Pagado en total", lines: ["Capital + intereses + seguro/manejo de todos los pagos registrados (cuotas y abonos extra)."] },
  loanEnd: { title: "Fecha estimada de fin", lines: ["Meses restantes = −ln(1 − saldo × tasa ÷ cuota) ÷ ln(1 + tasa), contados desde la próxima cuota.", "Los abonos extra a capital acortan el plazo. Intereses restantes ≈ cuota × meses − saldo."] },
  loanProgress: { title: "Saldo pendiente", lines: ["Monto del crédito − capital pagado. % pagado = capital pagado ÷ monto del crédito.", "«Cuotas atrasadas» = cuotas del plan con fecha ya vencida − cuotas pagadas registradas."] },
  amortization: { title: "Plan de pagos", lines: ["Cada mes: intereses = saldo × tasa mensual; capital = cuota − intereses; nuevo saldo = saldo − capital.", "Las barras de color pleno son las cuotas ya pagadas."] },
  reconcile: { title: "Conciliar", lines: ["Compara el saldo que calcula la app con el saldo real del banco y registra la diferencia como un ajuste fuera del PyG."] },
  // ── Otros ──
  txTotals: { title: "Ingresos y gastos de la lista", lines: ["Suma de los movimientos que ves con los filtros actuales (mes, estado, categoría, cuenta, tipo y búsqueda). Las transferencias no cuentan como ingreso ni gasto."] },
  unitValue: { title: "Valor por unidad", lines: ["Monto total ÷ cantidad."] },
  categoryFilter: { title: "Filtro de categorías", lines: ["Lo que desmarques no cuenta en ninguna cifra ni gráfica de la pantalla. Las reservas siempre se incluyen."] },
} satisfies Record<string, Explain>;
