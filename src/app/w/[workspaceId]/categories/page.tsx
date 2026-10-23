import { ActionForm } from "@/components/forms/action-form";
import { Chip } from "@/components/ui/chip";
import { prisma } from "@/lib/db";
import { pageCtx } from "@/lib/auth/permissions";
import { createCategoryAction, updateCategoryAction } from "@/modules/core/crud-actions";

export const metadata = { title: "Categorías" };
const KIND = { INCOME: "Ingreso", FIXED_OPEX: "Gasto fijo (OPEX)", VARIABLE: "Gasto variable", CAPEX: "Inversión (CAPEX)" } as const;
const PYG = { COMMISSION: "Comisiones", CLEANING: "Aseo", AMENITIES: "Amenities", OTHER_VARIABLE: "Otros variables", ADMIN: "Administración", UTILITIES: "Servicios", SUBSCRIPTIONS: "Suscripciones", MAINTENANCE: "Mantenimiento", OTHER_FIXED: "Otros fijos", CAPEX: "CAPEX", NON_OPERATING: "No operativo" } as const;

function Fields({ kind, pyg }: { kind?: string; pyg?: string }) {
  return (
    <>
      <div><label className="label">Tipo</label><select name="kind" defaultValue={kind ?? "VARIABLE"} className="input">{Object.entries(KIND).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      <div><label className="label">Línea del PyG</label><select name="pygLine" defaultValue={pyg && pyg !== "REVENUE" ? pyg : "OTHER_VARIABLE"} className="input">{Object.entries(PYG).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
    </>
  );
}

export default async function Categories({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  await pageCtx(workspaceId, "dashboard:full");
  const cats = await prisma.category.findMany({ where: { workspaceId }, orderBy: [{ archived: "asc" }, { expenseKind: "asc" }, { name: "asc" }], include: { _count: { select: { transactions: true } } } });
  return (
    <>
      <div><h1 className="text-3xl font-semibold tracking-tight">Categorías</h1><p className="text-muted">La “línea del PyG” decide dónde se suma cada gasto en el estado de resultados.</p></div>
      <section className="card space-y-4">
        <h2 className="font-medium">Nueva categoría</h2>
        <ActionForm action={createCategoryAction} submitLabel="Crear">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div className="grid gap-3 sm:grid-cols-4">
            <div><label className="label" htmlFor="name">Nombre</label><input id="name" name="name" required className="input" /></div>
            <div><label className="label" htmlFor="emoji">Emoji</label><input id="emoji" name="emoji" maxLength={8} className="input" placeholder="🧹" /></div>
            <Fields />
          </div>
        </ActionForm>
      </section>
      <section className="card !p-3">
        <ul className="divide-y divide-line">
          {cats.map((c) => (
            <li key={c.id} className={`p-3 ${c.archived ? "opacity-60" : ""}`}>
              <details>
                <summary className="flex cursor-pointer items-center justify-between gap-3"><span className="flex items-center gap-3"><span aria-hidden className="grid size-9 place-items-center rounded-full bg-canvas/70">{c.emoji ?? "•"}</span><span className="font-medium">{c.name}</span></span>
                  <span className="flex items-center gap-2"><Chip tone="brand">{c.expenseKind ? KIND[c.expenseKind] : "Ingreso"}</Chip>{c.archived && <Chip>Archivada</Chip>}<span className="text-xs text-muted">{c._count.transactions} mov.</span></span></summary>
                <ActionForm action={updateCategoryAction} submitLabel="Guardar" resetOnSuccess={false} className="mt-4 space-y-3">
                  <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="categoryId" value={c.id} />
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div><label className="label">Nombre</label><input name="name" defaultValue={c.name} required className="input" /></div>
                    <div><label className="label">Emoji</label><input name="emoji" defaultValue={c.emoji ?? ""} maxLength={8} className="input" /></div>
                    <Fields kind={c.expenseKind ?? "INCOME"} pyg={c.pygLine} />
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="archived" defaultChecked={c.archived} />Archivada (no aparece al registrar movimientos)</label>
                </ActionForm>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
