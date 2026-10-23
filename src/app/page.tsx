import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const first = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { archived: false } },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  });
  redirect(first ? `/w/${first.workspaceId}` : "/workspaces/new");
}
