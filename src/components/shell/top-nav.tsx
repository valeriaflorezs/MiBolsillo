"use client";

import { Bell, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { CRED_DOMAIN } from "@/lib/auth/credentials-shared";
import { ThemeToggle } from "./theme-toggle";

type Props = {
  workspaces: { id: string; name: string }[];
  currentId: string;
  user: { name: string; email: string; image: string | null };
  pending: number;
  canWrite: boolean;
  canCreateWorkspace: boolean;
  signOutAction: () => Promise<void>;
};

export function TopNav({ workspaces, currentId, user, pending, canWrite, canCreateWorkspace, signOutAction }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/w/${currentId}`;

  return (
    <header className="relative z-40 rounded-[2rem] border border-white/20 bg-panel/80 px-3 py-2.5 text-white shadow-card backdrop-blur-xl" style={{ boxShadow: "inset 0 1px 0 rgb(255 255 255 / .25), 0 14px 34px rgb(6 24 60 / .3)" }}>
      <div className="flex items-center gap-2">
        <Link href="/" aria-label="MiBolsillo — inicio" className="shrink-0 px-1 md:hidden"><Logo variant="mark" tone="onDark" height={28} /></Link>
        <label className="sr-only" htmlFor="ws-switch">Negocio</label>
        <select id="ws-switch" value={currentId} className="max-w-[9.5rem] truncate rounded-pill border-0 bg-white/10 px-3 py-2 text-sm font-medium text-white sm:max-w-[13rem]"
          onChange={(e) => (e.target.value === "__new" ? router.push("/workspaces/new") : router.push(`/w/${e.target.value}`))}>
          {workspaces.map((w) => <option className="bg-panel text-white" key={w.id} value={w.id}>{w.name}</option>)}
          {canCreateWorkspace && <option className="bg-panel text-white" value="__new">+ Nuevo negocio</option>}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {canWrite && <Link href={`${base}/expenses/new`} className="btn btn-accent hidden !px-3.5 md:inline-flex"><Plus size={16} aria-hidden />Movimiento</Link>}
          <Link href={`${base}/pending`} aria-label={pending ? `Pendientes: ${pending}` : "Pendientes"} className="relative grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
            <Bell size={18} aria-hidden />
            {pending > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-[#0b1b3a]">{pending > 9 ? "9+" : pending}</span>}
          </Link>
          <details key={`u${pathname}`} className="relative">
            <summary aria-label="Mi cuenta" className="grid size-10 cursor-pointer list-none place-items-center rounded-full ring-2 ring-white/20"><Avatar name={user.name || user.email} image={user.image} size={36} /></summary>
            <div className="absolute right-0 top-full z-30 mt-2 w-64 space-y-3 rounded-2xl bg-surface p-4 text-ink shadow-card">
              <div><p className="truncate font-medium">{user.name || "Mi cuenta"}</p><p className="truncate text-sm text-muted">{user.email.endsWith(CRED_DOMAIN) ? `@${user.email.slice(0, -CRED_DOMAIN.length)}` : user.email}</p></div>
              <ThemeToggle />
              <Link href="/account" className="btn btn-ghost w-full">Mi cuenta y privacidad</Link>
              <form action={signOutAction}><button type="submit" className="btn btn-dark w-full">Cerrar sesión</button></form>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
