import { SideRail } from "@/components/shell/side-rail";
import { TopNav } from "@/components/shell/top-nav";
import { KpiCard } from "@/components/ui/kpi-card";

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6">
      <TopNav />
      <div className="flex gap-6">
        <SideRail />
        <main className="flex-1 space-y-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Resumen</h1>
            <p className="mt-1 text-muted">Tus números aparecerán aquí cuando registres tu primer movimiento.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard title="Flujo de caja" value="—" hint="Mes actual" />
            <KpiCard title="Margen de contribución" value="—" hint="Mes actual" />
            <KpiCard title="EBITDA operativo" value="—" hint="Solo administradores" />
          </div>
        </main>
      </div>
    </div>
  );
}
