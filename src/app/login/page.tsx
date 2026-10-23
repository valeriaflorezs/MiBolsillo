import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth/config";

export const metadata = { title: "Entrar" };

function safeNext(n?: string) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if ((await auth())?.user) redirect(next);
  return (
    <main className="mx-auto grid min-h-screen max-w-5xl items-center gap-8 px-4 py-10 lg:grid-cols-2">
      <section className="panel hidden min-h-[28rem] flex-col justify-between lg:flex">
        <div className="flex items-center gap-2"><span aria-hidden className="grid size-10 place-items-center rounded-full bg-accent font-bold text-[#0b1b3a]">M</span><span className="text-xl font-semibold">MiBolsillo</span></div>
        <div className="space-y-3">
          <p className="text-4xl font-semibold leading-tight">Tus finanzas y tus negocios, en un solo lugar.</p>
          <p className="text-white/70">Gastos con foto de factura, estado de resultados, CAPEX y reservas de tu Airbnb.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          {["EBITDA", "Presupuesto", "Flujo de caja"].map((t) => <span key={t} className="rounded-2xl bg-white/10 px-3 py-3 backdrop-blur">{t}</span>)}
        </div>
      </section>
      <section className="card w-full space-y-6 text-center lg:text-left">
        <div className="flex items-center justify-center gap-2 lg:hidden"><span aria-hidden className="grid size-12 place-items-center rounded-full bg-panel text-xl font-semibold text-accent">M</span></div>
        <div><h1 className="text-3xl font-semibold tracking-tight">Bienvenido</h1><p className="mt-1 text-muted">Entra con tu cuenta de Google para continuar.</p></div>
        <form action={async () => { "use server"; await signIn("google", { redirectTo: next }); }}>
          <button type="submit" className="btn btn-primary w-full !py-3">Continuar con Google</button>
        </form>
        <p className="text-xs text-muted">Al continuar aceptas los <Link className="underline" href="/terminos">términos</Link> y la <Link className="underline" href="/privacidad">política de privacidad</Link>.</p>
      </section>
    </main>
  );
}
