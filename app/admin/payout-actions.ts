"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth";
import { PayoutDomainError } from "@/lib/payouts/payout-errors";
import {
  approvePayoutRequest,
  markPayoutRequestPaid,
  rejectPayoutRequest,
} from "@/lib/payouts/payout-service";
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

function resolveAdminRedirectPath(rawPath: string, fallbackPath: string) {
  if (!rawPath || !rawPath.startsWith("/admin")) {
    return fallbackPath;
  }

  return rawPath;
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

function mapPayoutErrorToMessage(error: unknown) {
  if (!(error instanceof PayoutDomainError)) {
    return "Не удалось выполнить действие по заявке.";
  }

  if (error.code === "PAYOUT_REQUEST_NOT_FOUND") {
    return "Заявка на вывод не найдена.";
  }

  if (error.code === "REJECTION_REASON_REQUIRED") {
    return "Укажите причину отклонения заявки.";
  }

  if (error.code === "PAYOUT_STATUS_TRANSITION_FAILED") {
    return "Недопустимый переход статуса для этой заявки.";
  }

  if (error.code === "INSUFFICIENT_AVAILABLE_CREDITS") {
    return "Не удалось завершить выплату: недостаточно средств на балансе пользователя.";
  }

  return error.message;
}

export async function approvePayoutRequestAction(formData: FormData) {
  const admin = await getAdminActor();
  const payoutRequestId = String(formData.get("payoutRequestId") ?? "").trim();
  const adminNote = String(formData.get("adminNote") ?? "");
  const redirectPath = resolveAdminRedirectPath(
    String(formData.get("redirectPath") ?? "").trim(),
    "/admin/payouts"
  );

  if (!payoutRequestId) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "Не удалось определить заявку для approve.",
      })
    );
  }

  try {
    await approvePayoutRequest({
      adminId: admin.id,
      adminNote,
      payoutRequestId,
    });
  } catch (error) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: mapPayoutErrorToMessage(error),
      })
    );
  }

  revalidatePath("/admin/payouts");
  redirect(
    buildRedirectUrl({
      path: redirectPath,
      notice: "Заявка переведена в статус Approved.",
    })
  );
}

export async function rejectPayoutRequestAction(formData: FormData) {
  const admin = await getAdminActor();
  const payoutRequestId = String(formData.get("payoutRequestId") ?? "").trim();
  const rejectionReason = String(formData.get("rejectionReason") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "");
  const redirectPath = resolveAdminRedirectPath(
    String(formData.get("redirectPath") ?? "").trim(),
    "/admin/payouts"
  );

  if (!payoutRequestId) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "Не удалось определить заявку для reject.",
      })
    );
  }

  try {
    await rejectPayoutRequest({
      adminId: admin.id,
      adminNote,
      payoutRequestId,
      rejectionReason,
    });
  } catch (error) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: mapPayoutErrorToMessage(error),
      })
    );
  }

  revalidatePath("/admin/payouts");
  revalidatePath("/app");
  redirect(
    buildRedirectUrl({
      path: redirectPath,
      notice: "Заявка отклонена, резерв пользователя разморожен.",
    })
  );
}

export async function markPayoutRequestPaidAction(formData: FormData) {
  const admin = await getAdminActor();
  const payoutRequestId = String(formData.get("payoutRequestId") ?? "").trim();
  const adminNote = String(formData.get("adminNote") ?? "");
  const redirectPath = resolveAdminRedirectPath(
    String(formData.get("redirectPath") ?? "").trim(),
    "/admin/payouts"
  );

  if (!payoutRequestId) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "Не удалось определить заявку для выплаты.",
      })
    );
  }

  try {
    await markPayoutRequestPaid({
      adminId: admin.id,
      adminNote,
      payoutRequestId,
    });
  } catch (error) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: mapPayoutErrorToMessage(error),
      })
    );
  }

  revalidatePath("/admin/payouts");
  revalidatePath("/app");
  redirect(
    buildRedirectUrl({
      path: redirectPath,
      notice: "Заявка отмечена как Paid. Баланс пользователя обновлен.",
    })
  );
}

export async function updateMinimumPayoutCreditsAction(formData: FormData) {
  await getAdminActor();

  const rawMinimum = String(formData.get("minimumPayoutCredits") ?? "").trim();
  const minimumPayoutCredits = Number.parseInt(rawMinimum, 10);
  const redirectPath = resolveAdminRedirectPath(
    String(formData.get("redirectPath") ?? "").trim(),
    "/admin/payouts"
  );

  if (!Number.isFinite(minimumPayoutCredits) || minimumPayoutCredits <= 0) {
    redirect(
      buildRedirectUrl({
        path: redirectPath,
        error: "Minimum payout must be greater than 0.",
      })
    );
  }

  const currentSettings = await prisma.referralProgramSettings.findUnique({
    select: {
      defaultDiscountPct: true,
      defaultRewardCredits: true,
      isEnabled: true,
    },
    where: { id: 1 },
  });

  await prisma.referralProgramSettings.upsert({
    create: {
      defaultDiscountPct: currentSettings?.defaultDiscountPct ?? 50,
      defaultRewardCredits: currentSettings?.defaultRewardCredits ?? 100,
      id: 1,
      isEnabled: currentSettings?.isEnabled ?? true,
      minimumPayoutCredits,
    },
    update: {
      minimumPayoutCredits,
    },
    where: { id: 1 },
  });

  revalidatePath("/admin/payouts");
  revalidatePath("/admin/codes");
  revalidatePath("/app");
  redirect(
    buildRedirectUrl({
      path: redirectPath,
      notice: "Minimum payout updated.",
    })
  );
}
