import { SideRail } from "@/components/shell/side-rail";
import { TopNav } from "@/components/shell/top-nav";
import { prisma } from "@/lib/db";
import { pageCtx } from "@/lib/auth/permissions";
import { auth, signOut } from "@/lib/auth/config";
import { tabsFor } from "@/lib/nav";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const ctx = await pageCtx(workspaceId);
  const session = await auth();
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: ctx.userId, workspace: { archived: false } },
    select: { workspace: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6">
      <TopNav
        tabs={tabsFor(workspaceId, ctx.workspace.type, ctx.role)}
        workspaces={memberships.map((m) => m.workspace)}
        currentId={workspaceId}
        userName={session?.user?.name ?? ""}
        signOutAction={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}
      />
      <div className="flex gap-6">
        <SideRail />
        <main className="min-w-0 flex-1 space-y-6">{children}</main>
      </div>
    </div>
  );
}
