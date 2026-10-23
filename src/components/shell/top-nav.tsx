"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Tab } from "@/lib/nav";

type Props = {
  tabs: Tab[];
  workspaces: { id: string; name: string }[];
  currentId: string;
  userName: string;
  signOutAction: () => Promise<void>;
};

export function TopNav({ tabs, workspaces, currentId, userName, signOutAction }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/w/${currentId}`;
  return (
    <header className="card flex flex-wrap items-center justify-between gap-3 !rounded-[2rem] !py-3 !pl-4 !pr-3">
      <div className="flex items-center gap-2">
        <Link href="/" aria-label="MiBolsillo — inicio" className="grid size-8 place-items-center rounded-full bg-brand font-semibold text-white">M</Link>
        <label className="sr-only" htmlFor="ws-switch">Negocio</label>
        <select id="ws-switch" value={currentId} className="rounded-pill border border-line bg-surface px-3 py-1.5 text-sm font-medium"
          onChange={(e) => (e.target.value === "__new" ? router.push("/workspaces/new") : router.push(`/w/${e.target.value}`))}>
          {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          <option value="__new">+ Nuevo negocio</option>
        </select>
      </div>

      <nav aria-label="Principal" className="order-last w-full overflow-x-auto md:order-none md:w-auto md:flex-1">
        <ul className="flex w-max gap-1 md:mx-auto">
          {tabs.map((t) => {
            const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={active ? "page" : undefined}
                  className={`block rounded-pill px-4 py-2 text-sm transition-colors ${active ? "bg-ink text-surface" : "text-muted hover:text-ink"}`}>
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-2">
        <Link href={`${base}/expenses/new`} className="btn btn-primary">+ Gasto</Link>
        <form action={signOutAction}>
          <button type="submit" className="btn btn-ghost" title={userName}>Salir</button>
        </form>
      </div>
    </header>
  );
}
