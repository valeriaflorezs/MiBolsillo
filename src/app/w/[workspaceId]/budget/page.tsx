import { ActionForm } from "@/components/forms/action-form";
import { MonthNav } from "@/components/ui/filters";
import { prisma } from "@/lib/db";
import { pageCtx } from "@/lib/auth/permissions";
import { cop, monthRange, num, pct } from "@/lib/format";
import { budgetExecution } from "@/modules/airbnb/queries";
import { saveBudgetAction } from "@/modules/core/finance-actions";
import { copyBudgetAction } from "@/modules/core/crud-actions";

export const metadata = { title: "Presupuesto" };

export default async function Budget({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ month?: string }> }) {
  const { workspaceId } = await params;
  await pageCtx(workspaceId, "budget:write");
  const { key, start, end } = monthRange((await searchParams).month);
  const [cats, exec] = await Promise.all([
    prisma.category.findMany({ where: { workspaceId, archived: false, expenseKind: { not: null } }, orderBy: { name: "asc" } }),
    budgetExecution(workspaceId, key, start, end),
  ]);
  const by = new Map(exec.rows.map((r) => [r.categoryId, r]));
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Presupuesto</h1>
      <MonthNav base={`/w/${workspaceId}/budget`} month={key} />
      <ActionForm action={copyBudgetAction} submitLabel="Copiar presupuesto del mes anterior" variant="ghost" resetOnSuccess={false} className="flex">
        <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="month" value={key} />
      </ActionForm>
      <section className="card !p-4">
        <ActionForm action={saveBudgetAction} submitLabel="Guardar presupuesto" resetOnSuccess={false}>
          <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="month" value={key} />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th">Categoría</th><th className="th">Presupuestado</th><th className="th text-right">Real</th><th className="th text-right">Ejecución</th></tr></thead>
              <tbody className="divide-y divide-line">
                {cats.map((c) => {
                  const r = by.get(c.id);
                  return (
                    <tr key={c.id}>
                      <td className="td">{c.emoji} {c.name}</td>
                      <td className="td"><label className="sr-only" htmlFor={`cat_${c.id}`}>Presupuesto {c.name}</label>
                        <input id={`cat_${c.id}`} name={`cat_${c.id}`} type="number" max="1000000000000" min="0" step="0.01" defaultValue={r ? num(r.budget) : ""} className="input !w-36" /></td>
                      <td className="td text-right">{r ? cop(r.actual) : "—"}</td>
                      <td className={`td text-right ${r && r.actual > r.budget ? "text-negative" : ""}`}>{r && r.budget ? pct(r.actual / r.budget) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
