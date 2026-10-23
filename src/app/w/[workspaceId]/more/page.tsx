import Link from "next/link";
import { NAV_ICONS } from "@/components/shell/nav-icons";
import { pageCtx } from "@/lib/auth/permissions";
import { type Tab, tabsFor } from "@/lib/nav";

export const metadata = { title: "Todo" };

export default async function More({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const ctx = await pageCtx(workspaceId);
  const { primary, more } = tabsFor(workspaceId, ctx.workspace.type, ctx.role);
  const extra: Tab[] = [{ href: `/w/${workspaceId}/pending`, label: "Pendientes", icon: "pending" }, { href: "/account", label: "Mi cuenta y privacidad", icon: "account" }];
  const groups: { title: string; items: Tab[] }[] = [{ title: "Principal", items: primary }, { title: "Gestión", items: more }, { title: "Cuenta", items: extra }];
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Todo</h1>
      {groups.filter((g) => g.items.length > 0).map((g) => (
        <section key={g.title} aria-label={g.title} className="space-y-3">
          <h2 className="px-1 text-sm font-medium text-muted">{g.title}</h2>
          <ul className="grid grid-cols-2 gap-3">
            {g.items.map((t) => {
              const Icon = NAV_ICONS[t.icon];
              return (
                <li key={t.href}>
                  <Link href={t.href} className="card flex h-full min-h-24 flex-col justify-between !p-4 hover:shadow-glow">
                    <span className="grid size-10 place-items-center rounded-2xl inset-strong text-brand-text"><Icon size={20} aria-hidden /></span>
                    <span className="mt-3 text-sm font-medium leading-tight">{t.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
