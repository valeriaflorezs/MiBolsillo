import { BottomNav } from "@/components/shell/bottom-nav";
import { TopNav } from "@/components/shell/top-nav";
import { SiteFooter } from "@/components/ui/site-footer";
import { prisma } from "@/lib/db";
import { can, pageCtx } from "@/lib/auth/permissions";
import { auth, signOut } from "@/lib/auth/config";
import { tabsFor } from "@/lib/nav";
import { daysFromNow } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const ctx = await pageCtx(workspaceId);
  const session = await auth();
  const soon = daysFromNow(7);
  const [memberships, pending] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { userId: ctx.userId, workspace: { archived: false } },
      select: { workspace: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    // Pendientes vencidos o que vencen en 7 días (el OPERATOR solo cuenta los suyos).
    prisma.transaction.count({
      where: { workspaceId, status: "PENDING", type: "EXPENSE", date: { lte: soon }, ...(can(ctx.role, "dashboard:full") ? {} : { createdById: ctx.userId }) },
    }),
  ]);
  const { primary, more } = tabsFor(workspaceId, ctx.workspace.type, ctx.role);
  return (
    <>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-5 pb-32 md:pb-8">
        <TopNav
          primary={primary} more={more} pending={pending}
          workspaces={memberships.map((m) => m.workspace)} currentId={workspaceId}
          user={{ name: session?.user?.name ?? "", email: session?.user?.email ?? "", image: session?.user?.image ?? null }}
          signOutAction={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}
        />
        <main className="min-w-0 flex-1 space-y-6">{children}</main>
        <SiteFooter />
      </div>
      <BottomNav workspaceId={workspaceId} showStats={primary.some((t) => t.href.endsWith("/stats"))} />
    </>
  );
}
