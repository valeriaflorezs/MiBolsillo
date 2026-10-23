import Link from "next/link";
import { pageCtx } from "@/lib/auth/permissions";
import { tabsFor } from "@/lib/nav";

export const metadata = { title: "Más" };

export default async function More({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const ctx = await pageCtx(workspaceId);
  const { primary, more } = tabsFor(workspaceId, ctx.workspace.type, ctx.role);
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Todo</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {[...primary, ...more, { href: `/w/${workspaceId}/pending`, label: "Pendientes" }, { href: "/account", label: "Mi cuenta y privacidad" }].map((t) => (
          <li key={t.href}><Link href={t.href} className="card block !py-4 font-medium hover:shadow-glow">{t.label} <span aria-hidden className="float-right text-muted">›</span></Link></li>
        ))}
      </ul>
    </>
  );
}
