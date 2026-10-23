export const metadata = { title: "Términos y condiciones" };

// BORRADOR: debe ser validado por un abogado antes de publicar.
export default function Terminos() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10">
      <h1 className="text-3xl font-semibold">Términos y condiciones</h1>
      <p className="text-sm text-muted">Borrador · pendiente de revisión legal.</p>
      <p>MiBolsillo es una herramienta de organización financiera. No ofrece asesoría contable, tributaria ni legal; las cifras dependen de los datos que registras. Eres responsable de la veracidad de la información y de las personas a las que das acceso a tus negocios.</p>
      <p>El servicio se presta “tal cual”. Puedes dejar de usarlo y solicitar la eliminación de tus datos en cualquier momento. Estos términos pueden cambiar; te avisaremos de cambios relevantes.</p>
    </main>
  );
}
