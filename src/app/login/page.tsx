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
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-4">
      <section className="card w-full space-y-6 text-center">
        <span aria-hidden className="mx-auto grid size-12 place-items-center rounded-full bg-brand text-xl font-semibold text-white">M</span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">MiBolsillo</h1>
          <p className="mt-1 text-muted">Tus finanzas y tus negocios en un solo lugar.</p>
        </div>
        <form action={async () => { "use server"; await signIn("google", { redirectTo: next }); }}>
          <button type="submit" className="btn btn-primary w-full !py-3">Continuar con Google</button>
        </form>
        <p className="text-xs text-muted">Al continuar aceptas el tratamiento de tus datos según la política de privacidad.</p>
      </section>
    </main>
  );
}
