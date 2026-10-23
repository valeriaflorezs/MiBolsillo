import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-white/80">
      <Link className="underline hover:text-white" href="/privacidad">Privacidad</Link> · <Link className="underline hover:text-white" href="/terminos">Términos</Link>
    </footer>
  );
}
