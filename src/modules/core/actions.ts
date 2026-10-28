"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { run, userError, type ActionState } from "@/lib/actions";
import { requireUser, requireWorkspace } from "@/lib/auth/permissions";
import { rateLimit } from "@/lib/security/rate-limit";
import { deleteObjects } from "@/lib/storage/r2";
import { CRED_DOMAIN, credentialEmail } from "@/lib/auth/credentials-shared";
import { generatePassword, hashPassword, USERNAME_RE } from "@/lib/auth/credentials";
import { provisionWorkspace } from "./provision";

const id = z.string().cuid();

export async function createWorkspaceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const user = await requireUser();
    if (user.email?.endsWith(CRED_DOMAIN)) throw userError("Esta cuenta es de solo lectura y no puede crear negocios.");
    rateLimit(`ws:${user.id}`, 10, 3_600_000);
    const input = z
      .object({
        name: z.string().trim().min(2, "Pon un nombre de al menos 2 letras").max(60),
        type: z.enum(["AIRBNB", "PERSONAL", "FREELANCE", "GIG_ECONOMY"]),
        propertyName: z.string().trim().max(80).optional(),
      })
      .parse(Object.fromEntries(fd));
    if ((await prisma.workspaceMember.count({ where: { userId: user.id } })) >= 20) throw userError("Alcanzaste el máximo de negocios.");

    const ws = await prisma.$transaction((tx) => provisionWorkspace(tx, { name: input.name, type: input.type, adminUserId: user.id, propertyName: input.propertyName }));
    redirect(`/w/${ws.id}`);
  });
}

export async function createInviteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const input = z
      .object({ workspaceId: id, email: z.string().trim().toLowerCase().email("Correo inválido"), role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]) })
      .parse(Object.fromEntries(fd));
    const { userId, role } = await requireWorkspace(input.workspaceId, "member:invite");
    if (input.role === "ADMIN" && role !== "ADMIN") throw userError("Solo un administrador puede invitar a otro administrador.");
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
    const input = z.object({ workspaceId: id, memberId: id, role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]) }).parse(Object.fromEntries(fd));
    await requireWorkspace(input.workspaceId, "member:manage");
    const target = await prisma.workspaceMember.findFirst({ where: { id: input.memberId, workspaceId: input.workspaceId }, include: { user: { select: { username: true } } } });
    if (!target) throw new Error("NOT_FOUND");
    if (target.user.username && input.role !== "VIEWER") throw userError("Las cuentas con usuario y contraseña solo pueden ser de solo lectura.");
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
    // Las cuentas de usuario/contraseña existen solo para este acceso: se eliminan si no les queda ningún negocio.
    const left = await prisma.workspaceMember.count({ where: { userId: target.userId } });
    if (!left) await prisma.user.deleteMany({ where: { id: target.userId, username: { not: null } } });
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
  // Un administrador que ya es miembro no baja de rol por aceptar una invitación (p. ej. creada por un Operador).
  const current = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: user.id } }, select: { role: true } });
  await prisma.$transaction([
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: user.id } },
      update: { role: current?.role === "ADMIN" ? "ADMIN" : invite.role },
      create: { workspaceId: invite.workspaceId, userId: user.id, role: invite.role },
    }),
    prisma.workspaceInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);
  return { workspaceId: invite.workspaceId };
}

/** Elimina un negocio y TODOS sus datos (incluidos los comprobantes en R2). Solo ADMIN, con confirmación por nombre. */
export async function deleteWorkspaceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ workspaceId: id, confirm: z.string() }).parse(Object.fromEntries(fd));
    const { workspace } = await requireWorkspace(i.workspaceId, "member:manage");
    if (i.confirm.trim() !== workspace.name) throw userError("Escribe el nombre exacto del negocio para confirmar.");
    const files = await prisma.attachment.findMany({ where: { workspaceId: i.workspaceId }, select: { storageKey: true } });
    await deleteObjects(files.map((f) => f.storageKey));
    // Orden explícito: las FKs de transacciones hacia cuentas/categorías no son en cascada.
    await prisma.$transaction([
      prisma.attachment.deleteMany({ where: { workspaceId: i.workspaceId } }),
      prisma.transaction.deleteMany({ where: { workspaceId: i.workspaceId } }),
      prisma.workspace.delete({ where: { id: i.workspaceId } }),
    ]);
    redirect("/");
  });
}

/** Crea una cuenta de solo lectura con usuario y contraseña generada. La contraseña se muestra una sola vez. */
export async function createViewerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const input = z
      .object({
        workspaceId: id,
        name: z.string().trim().min(2, "Pon el nombre de la persona").max(60),
        username: z.string().trim().toLowerCase().regex(USERNAME_RE, "Usuario de 4 a 30 caracteres: letras minúsculas, números, punto, guion o guion bajo."),
      })
      .parse(Object.fromEntries(fd));
    const { userId } = await requireWorkspace(input.workspaceId, "member:invite"); // las cuentas de solo lectura también las puede crear un Operador
    rateLimit(`viewer:${userId}`, 20, 3_600_000);
    if (await prisma.user.findUnique({ where: { username: input.username }, select: { id: true } })) throw userError("Ese usuario ya existe. Elige otro.");
    const password = generatePassword();
    await prisma.user.create({
      data: {
        username: input.username,
        email: credentialEmail(input.username),
        name: input.name,
        passwordHash: await hashPassword(password),
        memberships: { create: { workspaceId: input.workspaceId, role: "VIEWER" } },
      },
    });
    revalidatePath(`/w/${input.workspaceId}/settings`);
    return { message: "Cuenta creada", secret: { title: `Acceso para ${input.name}`, note: "Cópialo ahora: la contraseña no se vuelve a mostrar. Compártela por un canal privado.", items: [{ label: "Usuario", value: input.username }, { label: "Contraseña", value: password }] } };
  });
}

/** Genera una contraseña nueva para una cuenta de solo lectura . */
export async function resetViewerPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const input = z.object({ workspaceId: id, memberId: id }).parse(Object.fromEntries(fd));
    const { userId } = await requireWorkspace(input.workspaceId, "member:manage");
    rateLimit(`viewer:${userId}`, 20, 3_600_000);
    const target = await prisma.workspaceMember.findFirst({ where: { id: input.memberId, workspaceId: input.workspaceId, role: "VIEWER" }, include: { user: { select: { id: true, username: true } } } });
    if (!target?.user.username) throw new Error("NOT_FOUND");
    const password = generatePassword();
    await prisma.user.update({ where: { id: target.user.id }, data: { passwordHash: await hashPassword(password) } });
    return { message: "Contraseña renovada", secret: { title: `Nueva contraseña de ${target.user.username}`, note: "Cópiala ahora: no se vuelve a mostrar.", items: [{ label: "Usuario", value: target.user.username }, { label: "Contraseña", value: password }] } };
  });
}
