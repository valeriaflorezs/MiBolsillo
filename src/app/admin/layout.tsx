import Link from "next/link";
import { AdminTabs } from "@/components/shell/admin-tabs";
import { Logo } from "@/components/ui/logo";
import { pagePlatformAdmin } from "@/lib/auth/platform";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administración" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await pagePlatformAdmin();
  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between"><Link href="/" className="text-sm underline">‹ Volver a mis negocios</Link><Logo height={26} /></div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm text-muted">Plataforma</p><h1 className="text-4xl font-semibold tracking-tight">Administración</h1></div>
        <AdminTabs />
      </header>
      {children}
    </main>
  );
}
