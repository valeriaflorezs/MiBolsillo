import { ExpenseForm } from "@/components/forms/expense-form";
import { prisma } from "@/lib/db";
import { pageCtx } from "@/lib/auth/permissions";
import { createTransactionAction } from "@/modules/core/finance-actions";
import { accountOptions, categoryOptions } from "@/modules/core/queries";

export const metadata = { title: "Nuevo gasto" };

export default async function NewExpense({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const ctx = await pageCtx(workspaceId, "transaction:create");
  const isAdmin = ctx.role === "ADMIN";
  const [accounts, categories, properties] = await Promise.all([
    accountOptions(workspaceId),
    categoryOptions(workspaceId),
    prisma.property.findMany({ where: { workspaceId, active: true }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Registrar movimiento</h1>
      <section className="card max-w-3xl">
        <ExpenseForm workspaceId={workspaceId} isAdmin={isAdmin} accounts={accounts} properties={properties} action={createTransactionAction}
          categories={categories.filter((c) => isAdmin || c.expenseKind !== null)} />
      </section>
    </>
  );
}
