"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentSession, hashPasswordForStorage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncSubscriptionInXui } from "@/lib/xui-integration";

type UserActionState = {
  message: string;
  nonce: number;
  status: "error" | "idle" | "success";
};

function buildState(status: UserActionState["status"], message: string): UserActionState {
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

async function getTargetUser(userId: string) {
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

  return targetUser && targetUser.role === "USER" ? targetUser : null;
}

export async function resetUserPasswordAction(
  _prevState: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  void _prevState;

  await getAdminActor();

  const userId = String(formData.get("userId") ?? "").trim();
  const nextPassword = String(formData.get("nextPassword") ?? "");

  if (!userId) {
    return buildState("error", "Не удалось определить пользователя.");
  }

  if (!nextPassword) {
    return buildState("error", "Введите новый пароль.");
  }

  if (nextPassword.length > 128) {
    return buildState("error", "Новый пароль слишком длинный.");
  }

  const targetUser = await getTargetUser(userId);

  if (!targetUser) {
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

export async function grantUserCreditsAction(
  _prevState: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  void _prevState;

  await getAdminActor();

  const userId = String(formData.get("userId") ?? "").trim();
  const amountCredits = Number.parseInt(String(formData.get("amountCredits") ?? ""), 10);

  if (!userId) {
    return buildState("error", "Не удалось определить пользователя.");
  }

  if (!Number.isFinite(amountCredits) || amountCredits <= 0) {
    return buildState("error", "Введите положительное количество кредитов.");
  }

  const targetUser = await getTargetUser(userId);

  if (!targetUser) {
    return buildState("error", "Пользователь не найден.");
  }

  await prisma.user.update({
    data: {
      credits: {
        increment: amountCredits,
      },
    },
    where: {
      id: targetUser.id,
    },
  });

  revalidatePath("/admin/users");
  return buildState("success", `${amountCredits} credits issued to ${targetUser.username}.`);
}

export async function syncUserSubscriptionAction(
  _prevState: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  void _prevState;

  await getAdminActor();

  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) {
    return buildState("error", "Не удалось определить пользователя.");
  }

  const targetUser = await getTargetUser(userId);

  if (!targetUser) {
    return buildState("error", "Пользователь не найден.");
  }

  const subscription = await prisma.subscription.findFirst({
    orderBy: [{ startsAt: "desc" }, { startedAt: "desc" }],
    select: { id: true },
    where: {
      status: "ACTIVE",
      userId: targetUser.id,
    },
  });

  if (!subscription) {
    return buildState("error", `${targetUser.username} has no active subscription.`);
  }

  const result = await syncSubscriptionInXui(subscription.id);

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  revalidatePath("/app");

  if (!result.ok) {
    return buildState(
      "error",
      `3x-ui sync failed for ${targetUser.username}: ${result.error ?? "unknown error"}`
    );
  }

  return buildState("success", `Subscription synced for ${targetUser.username}.`);
}
