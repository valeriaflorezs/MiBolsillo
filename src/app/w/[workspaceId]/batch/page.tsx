import Link from "next/link";
import { BatchGrid } from "@/components/forms/batch-grid";
import { BATCH_SPECS, type BatchKind } from "@/lib/batch/spec";
import { pageCtx } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";

export const metadata = { title: "Carga en lote" };

export default async function BatchPage({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ k?: string }> }) {
  const { workspaceId } = await params;
  const sp = await searchParams;
  const ctx = await pageCtx(workspaceId, "dashboard:full");
  const airbnb = ctx.workspace.type === "AIRBNB";
  const loans = await prisma.loan.findMany({ where: { workspaceId }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } });
  const kinds: BatchKind[] = [...(airbnb ? (["transactions", "capex", "fixed"] as const) : (["transactions"] as const)), ...(loans.length ? (["allocations"] as const) : [])];
  const kind = kinds.find((k) => k === sp.k) ?? "transactions";
  const [accounts, categories, properties] = await Promise.all([
    prisma.financialAccount.findMany({ where: { workspaceId, archived: false }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ where: { workspaceId }, select: { name: true }, orderBy: { name: "asc" } }),
    airbnb ? prisma.property.findMany({ where: { workspaceId, active: true }, select: { id: true, name: true } }) : [],
  ]);
  const base = `/w/${workspaceId}/batch`;

  return (
    <>
      <div><h1 className="text-3xl font-semibold tracking-tight">Carga en lote</h1><p className="text-muted">Edita como en una hoja de cálculo: pega filas desde Excel o sube un archivo, revisa y guarda todo de una vez.</p></div>
      {kinds.length > 1 && (
        <nav aria-label="Tipo de carga" className="flex flex-wrap gap-2">
          {kinds.map((k) => <Link key={k} href={`${base}?k=${k}`} aria-current={k === kind ? "page" : undefined} className={k === kind ? "btn btn-primary" : "btn btn-ghost"}>{BATCH_SPECS[k].title}</Link>)}
        </nav>
      )}
      {kind === "capex" || kind === "fixed" ? properties.length === 0 : false
        ? <p className="card text-muted">Primero crea una propiedad en la sección Propiedades.</p>
        : <BatchGrid key={kind} kind={kind} workspaceId={workspaceId} properties={kind === "allocations" ? loans : properties} targetLabel={kind === "allocations" ? "Crédito" : "Propiedad"} lookups={{ categoria: categories.map((c) => c.name), cuenta: accounts.map((a) => a.name) }} />}
    </>
  );
}
