"use client";

import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Resumen" },
  { href: "/transactions", label: "Transacciones" },
  { href: "/capex", label: "CAPEX" },
  { href: "/pyg", label: "PyG" },
  { href: "/reservations", label: "Reservas" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="card flex items-center justify-between gap-4 !rounded-pill !py-3 !pl-4 !pr-3">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <span aria-hidden className="grid size-8 place-items-center rounded-full bg-brand text-white">M</span>
        <span className="hidden sm:inline">MiBolsillo</span>
      </Link>

      <nav aria-label="Principal" className="min-w-0 flex-1 overflow-x-auto">
        <ul className="flex w-max gap-1 md:mx-auto">
          {TABS.map((t) => {
            const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={active ? "page" : undefined}
                  className={`block rounded-pill px-4 py-2 text-sm transition-colors ${
                    active ? "bg-ink text-surface" : "text-muted hover:text-ink"
                  }`}>
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-1">
        <button type="button" aria-label="Buscar" className="grid size-9 place-items-center rounded-pill text-muted hover:text-ink">
          <Search size={18} aria-hidden />
        </button>
        <button type="button" aria-label="Notificaciones" className="grid size-9 place-items-center rounded-pill text-muted hover:text-ink">
          <Bell size={18} aria-hidden />
        </button>
      </div>
    </header>
  );
}
