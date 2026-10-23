export const metadata = { title: "Política de privacidad" };

// BORRADOR: debe ser validado por un abogado antes de publicar (Ley 1581 de 2012).
export default function Privacidad() {
  return (
    <main className="prose mx-auto max-w-2xl space-y-4 px-4 py-10">
      <h1 className="text-3xl font-semibold">Política de privacidad</h1>
      <p className="text-sm text-muted">Borrador · pendiente de revisión legal · Responsable: <strong>[RAZÓN SOCIAL / NOMBRE]</strong>, NIT <strong>[NIT]</strong>, contacto <strong>[CORREO]</strong>.</p>
      <h2 className="text-xl font-medium">Qué datos recogemos</h2>
      <p>Tu nombre, correo e imagen de perfil de Google; los movimientos financieros que registras (montos, fechas, proveedores, categorías); y las facturas o comprobantes que subes.</p>
      <h2 className="text-xl font-medium">Para qué los usamos</h2>
      <p>Para mostrarte tus cuentas, reportes y estado de resultados, y para leer automáticamente tus comprobantes. No vendemos tus datos ni los usamos para publicidad.</p>
      <h2 className="text-xl font-medium">Con quién se comparten</h2>
      <ul className="list-disc pl-6">
        <li>Google (inicio de sesión).</li>
        <li>Railway (alojamiento de la aplicación y base de datos).</li>
        <li>Cloudflare R2 (almacenamiento de comprobantes).</li>
        <li>Anthropic (lectura OCR: el comprobante se envía para extraer monto, fecha y proveedor; no se usa para entrenar modelos según sus términos de API).</li>
      </ul>
      <h2 className="text-xl font-medium">Cookies</h2>
      <p>Solo usamos cookies esenciales de sesión (necesarias para iniciar sesión) y una preferencia local de tema. No usamos analítica ni publicidad.</p>
      <h2 className="text-xl font-medium">Tus derechos</h2>
      <p>Puedes conocer, actualizar, corregir y solicitar la eliminación de tus datos escribiendo a <strong>[CORREO]</strong>. Eliminaremos tu cuenta, tus registros y tus comprobantes almacenados.</p>
      <h2 className="text-xl font-medium">Conservación</h2>
      <p>Conservamos tus datos mientras tengas la cuenta activa. Al eliminarla, se borran de la base de datos y del almacenamiento.</p>
    </main>
  );
}
