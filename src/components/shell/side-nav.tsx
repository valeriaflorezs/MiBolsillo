"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import type { Tab } from "@/lib/nav";
import { NAV_ICONS as ICONS } from "./nav-icons";

/**
 * Menú lateral de escritorio: colapsado muestra solo iconos; al acercar el cursor (o enfocar con teclado)
 * se despliega SOBRE el contenido mostrando las etiquetas. Las etiquetas siempre están en el DOM (lectores de pantalla).
 */
export function SideNav({ workspaceId, primary, more, pending }: { workspaceId: string; primary: Tab[]; more: Tab[]; pending: number }) {
  const pathname = usePathname();
  const base = `/w/${workspaceId}`;
  const isActive = (href: string) => (href === base ? pathname === base : pathname.startsWith(href));
  const footer: Tab[] = [{ href: `${base}/pending`, label: "Pendientes", icon: "pending" }, { href: "/account", label: "Mi cuenta y privacidad", icon: "account" }];

  const Item = ({ t }: { t: Tab }) => {
    const Icon = ICONS[t.icon];
    const active = isActive(t.href);
    return (
      <li>
        <Link href={t.href} aria-current={active ? "page" : undefined} title={t.label}
          className={`relative flex items-center gap-4 rounded-2xl px-3.5 py-2.5 text-sm transition-colors ${active ? "bg-brand on-brand shadow-glow" : "text-white/75 hover:bg-white/15 hover:text-white"}`}>
          <Icon size={20} className="shrink-0" aria-hidden />
          <span className="whitespace-nowrap opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">{t.label}</span>
          {t.icon === "pending" && pending > 0 && (
            <span className="absolute left-7 top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-[#0b1b3a]">{pending > 9 ? "9+" : pending}</span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <aside aria-label="Secciones"
      className="group fixed bottom-4 left-4 top-4 z-50 hidden w-[4.75rem] overflow-hidden rounded-[2rem] border border-white/20 bg-panel/80 p-2.5 text-white shadow-card backdrop-blur-2xl transition-[width] duration-200 ease-out hover:w-64 focus-within:w-64 md:block"
      style={{ boxShadow: "inset 0 1px 0 rgb(255 255 255 / .25), 0 14px 34px rgb(6 24 60 / .35)" }}>
      <div className="flex h-full flex-col">
        <Link href="/" aria-label="MiBolsillo — inicio" className="mb-3 flex h-12 items-center rounded-2xl px-2.5">
          <span className="group-focus-within:hidden group-hover:hidden"><Logo variant="mark" tone="onDark" height={30} /></span>
          <span className="hidden group-focus-within:block group-hover:block"><Logo tone="onDark" height={26} /></span>
        </Link>
        <nav className="no-scrollbar flex-1 space-y-3 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-1">{primary.map((t) => <Item key={t.href} t={t} />)}</ul>
          {more.length > 0 && <hr className="border-white/15" />}
          <ul className="space-y-1">{more.map((t) => <Item key={t.href} t={t} />)}</ul>
        </nav>
        <hr className="my-2 border-white/15" />
        <ul className="space-y-1">{footer.map((t) => <Item key={t.href} t={t} />)}</ul>
      </div>
    </aside>
  );
}
