"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Empresas y usuarios" },
  { href: "/admin/actividad", label: "Actividad" },
  { href: "/admin/ia", label: "Consumo de IA" },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones de administración" className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line p-1">
      {TABS.map((t) => {
        const on = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
        return <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${on ? "bg-brand on-brand" : "hover:bg-canvas"}`}>{t.label}</Link>;
      })}
    </nav>
  );
}
