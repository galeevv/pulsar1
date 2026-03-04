"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getCurrentSession,
  hashPasswordForStorage,
  isValidMarzbanCompatibleUsername,
  normalizeUsername,
  verifyPasswordAgainstHash,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function buildRedirectUrl(params: {
  anchor: string;
  error?: string;
  notice?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.notice) {
    searchParams.set("notice", params.notice);
  }

  if (params.error) {
    searchParams.set("error", params.error);
  }

  const query = searchParams.toString();
  return `/admin${query ? `?${query}` : ""}${params.anchor}`;
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
    select: {
      id: true,
      passwordHash: true,
      username: true,
    },
    where: { username: session.username },
  });

  if (!user) {
    redirect("/login?mode=login&error=Сначала войдите в аккаунт.");
  }

  return user;
}

export async function updateAdminCredentialsAction(formData: FormData) {
  const admin = await getAdminActor();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const nextUsernameRaw = String(formData.get("nextUsername") ?? "");
  const nextPassword = String(formData.get("nextPassword") ?? "");
  const nextPasswordConfirmation = String(formData.get("nextPasswordConfirmation") ?? "");

  if (!currentPassword) {
    redirect(
      buildRedirectUrl({
        anchor: "#account",
        error: "Введите текущий пароль для подтверждения изменений.",
      })
    );
  }

  const currentPasswordValid = verifyPasswordAgainstHash(currentPassword, admin.passwordHash);

  if (!currentPasswordValid) {
    redirect(
      buildRedirectUrl({
        anchor: "#account",
        error: "Текущий пароль указан неверно.",
      })
    );
  }

  const updates: {
    username?: string;
    passwordHash?: string;
  } = {};

  const nextUsername = normalizeUsername(nextUsernameRaw);
  if (nextUsername && nextUsername !== admin.username) {
    if (!isValidMarzbanCompatibleUsername(nextUsername)) {
      redirect(
        buildRedirectUrl({
          anchor: "#account",
          error:
            "Логин должен быть от 3 до 32 символов и содержать только a-z, 0-9 и _.",
        })
      );
    }

    const takenUser = await prisma.user.findUnique({
      select: { id: true },
      where: { username: nextUsername },
    });

    if (takenUser) {
      redirect(
        buildRedirectUrl({
          anchor: "#account",
          error: "Этот логин уже занят.",
        })
      );
    }

    updates.username = nextUsername;
  }

  if (nextPassword || nextPasswordConfirmation) {
    if (nextPassword.length < 8) {
      redirect(
        buildRedirectUrl({
          anchor: "#account",
          error: "Новый пароль должен быть не короче 8 символов.",
        })
      );
    }

    if (nextPassword !== nextPasswordConfirmation) {
      redirect(
        buildRedirectUrl({
          anchor: "#account",
          error: "Новый пароль и подтверждение не совпадают.",
        })
      );
    }

    updates.passwordHash = hashPasswordForStorage(nextPassword);
  }

  if (!updates.username && !updates.passwordHash) {
    redirect(
      buildRedirectUrl({
        anchor: "#account",
        error: "Нет изменений для сохранения.",
      })
    );
  }

  await prisma.user.update({
    data: updates,
    where: { id: admin.id },
  });

  revalidatePath("/admin");
  revalidatePath("/login");
  redirect(
    buildRedirectUrl({
      anchor: "#account",
      notice: "Данные администратора обновлены.",
    })
  );
}
