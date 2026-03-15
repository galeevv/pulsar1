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
  path: string;
  error?: string;
  notice?: string;
}) {
  const [pathname, rawQuery = ""] = params.path.split("?");
  const searchParams = new URLSearchParams(rawQuery);

  if (params.notice) {
    searchParams.set("notice", params.notice);
  }

  if (params.error) {
    searchParams.set("error", params.error);
  }

  const query = searchParams.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

function normalizeReturnPath(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value.trim() : "";

  if (!path.startsWith("/admin")) {
    return "/admin";
  }

  return path;
}

async function getAdminActor() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?mode=login&error=Please log in first.");
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
    redirect("/login?mode=login&error=Please log in first.");
  }

  return user;
}

export async function updateAdminCredentialsAction(formData: FormData) {
  const admin = await getAdminActor();
  const returnPath = normalizeReturnPath(formData.get("returnPath"));

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const nextUsernameRaw = String(formData.get("nextUsername") ?? "");
  const nextPassword = String(formData.get("nextPassword") ?? "");
  const nextPasswordConfirmation = String(formData.get("nextPasswordConfirmation") ?? "");

  if (!currentPassword) {
    redirect(
      buildRedirectUrl({
        path: returnPath,
        error: "Enter your current password to confirm changes.",
      })
    );
  }

  const currentPasswordValid = verifyPasswordAgainstHash(currentPassword, admin.passwordHash);

  if (!currentPasswordValid) {
    redirect(
      buildRedirectUrl({
        path: returnPath,
        error: "Current password is incorrect.",
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
          path: returnPath,
          error: "Username must be 3-32 chars and contain only a-z, 0-9 and _.",
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
          path: returnPath,
          error: "This username is already taken.",
        })
      );
    }

    updates.username = nextUsername;
  }

  if (nextPassword || nextPasswordConfirmation) {
    if (nextPassword.length < 8) {
      redirect(
        buildRedirectUrl({
          path: returnPath,
          error: "New password must be at least 8 characters.",
        })
      );
    }

    if (nextPassword !== nextPasswordConfirmation) {
      redirect(
        buildRedirectUrl({
          path: returnPath,
          error: "New password and confirmation do not match.",
        })
      );
    }

    updates.passwordHash = hashPasswordForStorage(nextPassword);
  }

  if (!updates.username && !updates.passwordHash) {
    redirect(
      buildRedirectUrl({
        path: returnPath,
        error: "No changes to save.",
      })
    );
  }

  await prisma.user.update({
    data: updates,
    where: { id: admin.id },
  });

  revalidatePath("/admin");
  revalidatePath("/login");
  revalidatePath(returnPath);
  redirect(
    buildRedirectUrl({
      path: returnPath,
      notice: "Admin credentials were updated.",
    })
  );
}
