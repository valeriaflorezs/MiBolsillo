"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { run, userError, type ActionState } from "@/lib/actions";
import { requireUser, requireWorkspace } from "@/lib/auth/permissions";
import { rateLimit } from "@/lib/security/rate-limit";
import { DEFAULT_CATEGORIES } from "./defaults";

const id = z.string().cuid();

export async function createWorkspaceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await requireUser();
    rateLimit(`ws:${user.id}`, 10, 3_600_000);
    const input = z
      .object({
        name: z.string().trim().min(2, "Pon un nombre de al menos 2 letras").max(60),
        type: z.enum(["AIRBNB", "PERSONAL", "FREELANCE", "GIG_ECONOMY"]),
        propertyName: z.string().trim().max(80).optional(),
      })
      .parse(Object.fromEntries(fd));
    if ((await prisma.workspaceMember.count({ where: { userId: user.id } })) >= 20) throw userError("Alcanzaste el máximo de negocios.");

    const ws = await prisma.$transaction(async (tx) => {
      const w = await tx.workspace.create({
        data: { name: input.name, type: input.type, members: { create: { userId: user.id, role: "ADMIN" } } },
      });
      await tx.category.createMany({
        data: DEFAULT_CATEGORIES[input.type].map((c) => ({
          workspaceId: w.id,
          name: c.name,
          emoji: c.emoji,
          expenseKind: c.income ? null : c.kind,
          pygLine: c.pygLine,
        })),
      });
      await tx.financialAccount.create({ data: { workspaceId: w.id, name: "Efectivo", type: "CASH", emoji: "💵" } });
      if (input.type === "AIRBNB") {
        await tx.property.create({ data: { workspaceId: w.id, name: input.propertyName || input.name } });
      }
      return w;
    });
    redirect(`/w/${ws.id}`);
  });
}

export async function createInviteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const input = z
      .object({ workspaceId: id, email: z.string().trim().toLowerCase().email("Correo inválido"), role: z.enum(["ADMIN", "OPERATOR"]) })
      .parse(Object.fromEntries(fd));
    const { userId } = await requireWorkspace(input.workspaceId, "member:manage");
    rateLimit(`invite:${userId}`, 20, 3_600_000);
    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 86_400_000);
    await prisma.workspaceInvite.upsert({
      where: { workspaceId_email: { workspaceId: input.workspaceId, email: input.email } },
      update: { role: input.role, token, expiresAt, acceptedAt: null, invitedById: userId },
      create: { workspaceId: input.workspaceId, email: input.email, role: input.role, token, expiresAt, invitedById: userId },
    });
    revalidatePath(`/w/${input.workspaceId}/settings`);
    return "Invitación creada: copia el enlace de la lista.";
  });
}

export async function changeMemberRoleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const input = z.object({ workspaceId: id, memberId: id, role: z.enum(["ADMIN", "OPERATOR"]) }).parse(Object.fromEntries(fd));
    await requireWorkspace(input.workspaceId, "member:manage");
    const target = await prisma.workspaceMember.findFirst({ where: { id: input.memberId, workspaceId: input.workspaceId } });
    if (!target) throw new Error("NOT_FOUND");
    if (target.role === "ADMIN" && input.role !== "ADMIN") await assertOtherAdmin(input.workspaceId, target.id);
    await prisma.workspaceMember.update({ where: { id: target.id }, data: { role: input.role } });
    revalidatePath(`/w/${input.workspaceId}/settings`);
    return "Rol actualizado";
  });
}

export async function removeMemberAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const input = z.object({ workspaceId: id, memberId: id }).parse(Object.fromEntries(fd));
    await requireWorkspace(input.workspaceId, "member:manage");
    const target = await prisma.workspaceMember.findFirst({ where: { id: input.memberId, workspaceId: input.workspaceId } });
    if (!target) throw new Error("NOT_FOUND");
    if (target.role === "ADMIN") await assertOtherAdmin(input.workspaceId, target.id);
    await prisma.workspaceMember.delete({ where: { id: target.id } });
    revalidatePath(`/w/${input.workspaceId}/settings`);
    return "Miembro eliminado";
  });
}

async function assertOtherAdmin(workspaceId: string, exceptMemberId: string) {
  const others = await prisma.workspaceMember.count({ where: { workspaceId, role: "ADMIN", NOT: { id: exceptMemberId } } });
  if (!others) throw userError("Debe quedar al menos un administrador.");
}

/** Acepta una invitación: el correo de la sesión debe coincidir con el invitado. */
export async function acceptInvite(token: string) {
  const user = await requireUser();
  const invite = await prisma.workspaceInvite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) return { error: "La invitación no es válida o expiró." };
  if (invite.email !== user.email?.toLowerCase()) return { error: `Esta invitación es para ${invite.email}. Inicia sesión con ese correo.` };
  await prisma.$transaction([
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: user.id } },
      update: { role: invite.role },
      create: { workspaceId: invite.workspaceId, userId: user.id, role: invite.role },
    }),
    prisma.workspaceInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);
  return { workspaceId: invite.workspaceId };
}
