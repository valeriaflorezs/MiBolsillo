import { ExpenseForm } from "@/components/forms/expense-form";
import { prisma } from "@/lib/db";
import { num } from "@/lib/format";
import { receiptCapabilities } from "@/lib/ocr/config";
import { pageCtx } from "@/lib/auth/permissions";
import { createTransactionAction } from "@/modules/core/finance-actions";
import { accountOptions, categoryOptions } from "@/modules/core/queries";

export const metadata = { title: "Nuevo gasto" };

export default async function NewExpense({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ type?: string }> }) {
  const { workspaceId } = await params;
  const { type } = await searchParams;
  const ctx = await pageCtx(workspaceId, "transaction:create");
  const isAdmin = ctx.role === "ADMIN";
  const [accounts, categories, pendingCapex, properties] = await Promise.all([
    accountOptions(workspaceId),
    categoryOptions(workspaceId),
    prisma.capexItem.findMany({ where: { workspaceId }, orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { itemDescription: "asc" }] }),
    prisma.property.findMany({ where: { workspaceId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Registrar movimiento</h1>
      <section className="card max-w-3xl">
        <ExpenseForm workspaceId={workspaceId} isAdmin={isAdmin} receipts={receiptCapabilities()} defaultType={isAdmin && (type === "INCOME" || type === "TRANSFER") ? type : "EXPENSE"} accounts={accounts} properties={properties}
          capexItems={pendingCapex.map((c) => ({ id: c.id, name: `${c.itemDescription} (x${c.quantity})${c.status === "PURCHASED" ? " · ya con gastos" : ""}`, total: c.status === "PURCHASED" ? 0 : Math.round(c.quantity * num(c.budgetedUnitPrice) * 100) / 100 }))} action={createTransactionAction}
          categories={categories.filter((c) => isAdmin || c.expenseKind !== null)} />
      </section>
    </>
  );
}
