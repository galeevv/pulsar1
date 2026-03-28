"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentSession, hashPasswordForStorage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ResetUserPasswordActionState = {
  message: string;
  nonce: number;
  status: "error" | "idle" | "success";
};

function buildState(
  status: ResetUserPasswordActionState["status"],
  message: string
): ResetUserPasswordActionState {
  return {
    message,
    nonce: Date.now(),
    status,
  };
}

async function getAdminActor() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?mode=login&error=Сначала войдите в аккаунт.");
  }

  if (session.role !== "ADMIN") {
    redirect("/app");
  }

  const user = await prisma.user.findUnique({
    select: { id: true },
    where: { username: session.username },
  });

  if (!user) {
    redirect("/login?mode=login&error=Сначала войдите в аккаунт.");
  }

  return user;
}

export async function resetUserPasswordAction(
  _prevState: ResetUserPasswordActionState,
  formData: FormData
): Promise<ResetUserPasswordActionState> {
  void _prevState;

  await getAdminActor();

  const userId = String(formData.get("userId") ?? "").trim();
  const nextPassword = String(formData.get("nextPassword") ?? "");
  const nextPasswordConfirmation = String(formData.get("nextPasswordConfirmation") ?? "");

  if (!userId) {
    return buildState("error", "Не удалось определить пользователя.");
  }

  if (!nextPassword || !nextPasswordConfirmation) {
    return buildState("error", "Введите новый пароль и подтверждение.");
  }

  if (nextPassword.length < 8) {
    return buildState("error", "Новый пароль должен содержать минимум 8 символов.");
  }

  if (nextPassword.length > 128) {
    return buildState("error", "Новый пароль слишком длинный.");
  }

  if (nextPassword !== nextPasswordConfirmation) {
    return buildState("error", "Пароль и подтверждение не совпадают.");
  }

  const targetUser = await prisma.user.findUnique({
    select: {
      id: true,
      role: true,
      username: true,
    },
    where: {
      id: userId,
    },
  });

  if (!targetUser || targetUser.role !== "USER") {
    return buildState("error", "Пользователь не найден.");
  }

  await prisma.$transaction([
    prisma.user.update({
      data: {
        passwordHash: hashPasswordForStorage(nextPassword),
      },
      where: {
        id: targetUser.id,
      },
    }),
    prisma.session.deleteMany({
      where: {
        userId: targetUser.id,
      },
    }),
  ]);

  revalidatePath("/admin/users");
  return buildState("success", `Пароль пользователя ${targetUser.username} обновлен.`);
}

