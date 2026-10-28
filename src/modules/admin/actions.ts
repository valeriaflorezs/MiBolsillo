"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { run, userError, type ActionState } from "@/lib/actions";
import { noteAction } from "@/lib/audit";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { credentialEmail } from "@/lib/auth/credentials-shared";
import { generatePassword, hashPassword, USERNAME_RE } from "@/lib/auth/credentials";
import { bool, id } from "@/lib/validation";

const refresh = () => revalidatePath("/admin", "layout");

/** Crea una cuenta con usuario y contraseña en una empresa (workspace). La clave se muestra una vez en una ventana. */
export async function createPlatformUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({
      username: z.string().trim().toLowerCase().regex(USERNAME_RE, "Usuario de 4 a 30 caracteres: letras minúsculas, números, punto, guion o guion bajo."),
      name: z.string().trim().min(2, "Pon el nombre de la persona").max(60),
      workspaceId: id,
      password: z.string().min(8, "La clave debe tener al menos 8 caracteres").max(100),
    }).parse(Object.fromEntries(fd));
    await requirePlatformAdmin();
    if (!(await prisma.workspace.count({ where: { id: i.workspaceId } }))) throw userError("Esa empresa no existe.");
    if (await prisma.user.findUnique({ where: { username: i.username }, select: { id: true } })) throw userError("Ese usuario ya existe. Elige otro.");
    await prisma.user.create({
      data: { username: i.username, email: credentialEmail(i.username), name: i.name, passwordHash: await hashPassword(i.password), memberships: { create: { workspaceId: i.workspaceId, role: "VIEWER" } } },
    });
    noteAction({ workspaceId: i.workspaceId, summary: `Creó el usuario ${i.username}` });
    refresh();
    return { message: "Usuario creado", secret: { title: `Acceso para ${i.name}`, note: "Cópialo ahora: la clave no se vuelve a mostrar.", items: [{ label: "Usuario", value: i.username }, { label: "Clave", value: i.password }] } };
  });
}

export async function resetPlatformPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ userId: id }).parse(Object.fromEntries(fd));
    await requirePlatformAdmin();
    const u = await prisma.user.findUnique({ where: { id: i.userId }, select: { id: true, username: true } });
    if (!u?.username) throw userError("Solo las cuentas con usuario y clave tienen contraseña propia.");
    const password = generatePassword();
    await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(password) } });
    noteAction({ summary: `Generó una clave nueva para ${u.username}` });
    return { message: "Clave renovada", secret: { title: `Nueva clave de ${u.username}`, note: "Cópiala ahora: no se vuelve a mostrar.", items: [{ label: "Usuario", value: u.username }, { label: "Clave", value: password }] } };
  });
}

export async function setUserActiveAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const i = z.object({ userId: id, active: bool }).parse(Object.fromEntries(fd));
    const { userId } = await requirePlatformAdmin();
    if (i.userId === userId) throw userError("No puedes desactivar tu propia cuenta.");
    const u = await prisma.user.findUnique({ where: { id: i.userId }, select: { id: true, username: true, email: true } });
    if (!u) throw new Error("NOT_FOUND");
    await prisma.user.update({ where: { id: u.id }, data: { active: i.active } });
    if (!i.active) await prisma.session.deleteMany({ where: { userId: u.id } });
    noteAction({ summary: `${i.active ? "Activó" : "Desactivó"} al usuario ${u.username ?? u.email}` });
    refresh();
    return i.active ? "Usuario activado" : "Usuario desactivado";
  });
}
