"use client";

import { BarChart3, Home, LayoutGrid, Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Navegación inferior flotante para móvil (botón central = nuevo movimiento). */
export function BottomNav({ workspaceId, showStats }: { workspaceId: string; showStats: boolean }) {
  const pathname = usePathname();
  const b = `/w/${workspaceId}`;
  const item = (href: string, label: string, Icon: typeof Home) => {
    const active = href === b ? pathname === b : pathname.startsWith(href);
    return (
      <li key={href}>
        <Link href={href} aria-current={active ? "page" : undefined} className={`flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[11px] ${active ? "text-accent" : "text-white/70"}`}>
          <Icon size={20} aria-hidden />{label}
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="Navegación móvil" className="fixed inset-x-4 bottom-4 z-40 md:hidden">
      <ul className="mx-auto flex max-w-sm items-center justify-between rounded-[2rem] bg-panel px-3 py-2 shadow-card">
        {item(b, "Resumen", Home)}
        {item(`${b}/transactions`, "Movimientos", Receipt)}
        <li>
          <Link href={`${b}/expenses/new`} aria-label="Nuevo movimiento" className="-mt-7 grid size-14 place-items-center rounded-full bg-accent text-[#0b1b3a] shadow-glow ring-4 ring-canvas"><Plus size={26} aria-hidden /></Link>
        </li>
        {showStats ? item(`${b}/stats`, "Estadísticas", BarChart3) : item(`${b}/wishlist`, "Deseos", BarChart3)}
        {item(`${b}/more`, "Más", LayoutGrid)}
      </ul>
    </nav>
  );
}
