import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { auth, signIn } from "@/lib/auth/config";
import { CredentialsForm } from "./credentials-form";

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
        <Logo tone="onDark" height={40} />
        <div className="space-y-3">
          <p className="text-4xl font-semibold leading-tight">Tus finanzas y tus negocios, en un solo lugar.</p>
          <p className="text-white/70">Gastos con foto de factura, estado de resultados, CAPEX de tu Airbnb.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          {["EBITDA", "Presupuesto", "Flujo de caja"].map((t) => <span key={t} className="rounded-2xl bg-white/10 px-3 py-3 backdrop-blur">{t}</span>)}
        </div>
      </section>
      <section className="card w-full space-y-6 text-center lg:text-left">
        <div className="flex justify-center lg:hidden"><Logo height={34} /></div>
        <div><h1 className="text-3xl font-semibold tracking-tight">Bienvenido</h1><p className="mt-1 text-muted">Entra con Google o con el usuario que te dieron.</p></div>
        <form action={async () => { "use server"; await signIn("google", { redirectTo: next }); }}>
          <button type="submit" className="btn btn-primary w-full !py-3">Continuar con Google</button>
        </form>
        <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />o con usuario y contraseña<span className="h-px flex-1 bg-line" /></div>
        <CredentialsForm next={next} />
        <p className="text-xs text-muted">Al continuar aceptas los <Link className="underline" href="/terminos">términos</Link> y la <Link className="underline" href="/privacidad">política de privacidad</Link>.</p>
      </section>
    </main>
  );
}
