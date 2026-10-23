import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-muted">
      <Link className="underline" href="/privacidad">Privacidad</Link> · <Link className="underline" href="/terminos">Términos</Link>
    </footer>
  );
}
