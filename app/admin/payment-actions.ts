"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth";
import {
  revokeSubscriptionInXui,
  syncSubscriptionInXui,
} from "@/lib/xui-integration";
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

async function ensureAdminActor() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?mode=login&error=Сначала войдите в аккаунт.");
  }

  if (session.role !== "ADMIN") {
    redirect("/app");
  }
}

export async function approvePaymentRequestAction(formData: FormData) {
  await ensureAdminActor();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect(buildRedirectUrl({ anchor: "#payments", error: "Заявка не найдена." }));
  }

  const paymentRequest = await prisma.paymentRequest.findUnique({
    include: {
      subscription: {
        select: {
          id: true,
        },
      },
      user: {
        select: {
          referralCodeUse: {
            include: {
              referralCode: {
                select: {
                  ownerUserId: true,
                },
              },
            },
          },
        },
      },
    },
    where: { id },
  });

  if (!paymentRequest) {
    redirect(buildRedirectUrl({ anchor: "#payments", error: "Заявка не найдена." }));
  }

  if (paymentRequest.status === "APPROVED") {
    redirect(buildRedirectUrl({ anchor: "#payments", error: "Заявка уже подтверждена." }));
  }

  if (paymentRequest.status === "REJECTED") {
    redirect(buildRedirectUrl({ anchor: "#payments", error: "Заявка уже отклонена." }));
  }

  if (paymentRequest.status !== "MARKED_PAID") {
    redirect(
      buildRedirectUrl({
        anchor: "#payments",
        error: "Подтвердить можно только заявку со статусом «Оплачено».",
      })
    );
  }

  const approvedBefore = await prisma.paymentRequest.count({
    where: {
      id: {
        not: paymentRequest.id,
      },
      status: "APPROVED",
      userId: paymentRequest.userId,
    },
  });

  const referredUse = paymentRequest.user.referralCodeUse;
  const canGrantReferralReward =
    approvedBefore === 0 &&
    Boolean(referredUse && !referredUse.rewardGrantedAt && referredUse.referralCode.ownerUserId);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.paymentRequest.update({
      data: {
        approvedAt: now,
        status: "APPROVED",
      },
      where: { id: paymentRequest.id },
    });

    if (canGrantReferralReward && referredUse) {
      await tx.user.update({
        data: {
          credits: {
            increment: referredUse.rewardCreditsSnapshot,
          },
        },
        where: {
          id: referredUse.referralCode.ownerUserId!,
        },
      });

      await tx.referralCodeUse.update({
        data: {
          rewardGrantedAt: now,
        },
        where: {
          id: referredUse.id,
        },
      });
    }
  });

  let integrationNotice = "";

  if (paymentRequest.subscription?.id) {
    const syncResult = await syncSubscriptionInXui(paymentRequest.subscription.id);

    if (!syncResult.ok) {
      integrationNotice =
        " Локальная заявка подтверждена, но синхронизация с Marzban завершилась ошибкой.";
    }
  }

  revalidatePath("/admin");
  revalidatePath("/app");
  redirect(
    buildRedirectUrl({
      anchor: "#payments",
      notice: canGrantReferralReward
        ? `Заявка подтверждена. Бонус по рефералке начислен.${integrationNotice}`
        : `Заявка подтверждена.${integrationNotice}`,
    })
  );
}

export async function rejectPaymentRequestAction(formData: FormData) {
  await ensureAdminActor();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect(buildRedirectUrl({ anchor: "#payments", error: "Заявка не найдена." }));
  }

  const paymentRequest = await prisma.paymentRequest.findUnique({
    include: {
      subscription: {
        include: {
          deviceSlots: {
            select: { id: true },
          },
        },
      },
    },
    where: { id },
  });

  if (!paymentRequest) {
    redirect(buildRedirectUrl({ anchor: "#payments", error: "Заявка не найдена." }));
  }

  if (paymentRequest.status === "APPROVED") {
    redirect(
      buildRedirectUrl({
        anchor: "#payments",
        error: "Подтвержденную заявку нельзя отклонить этим действием.",
      })
    );
  }

  if (paymentRequest.status === "REJECTED") {
    redirect(buildRedirectUrl({ anchor: "#payments", error: "Заявка уже отклонена." }));
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.paymentRequest.update({
      data: {
        rejectedAt: now,
        status: "REJECTED",
      },
      where: { id: paymentRequest.id },
    });

    if (paymentRequest.subscription) {
      await tx.subscription.update({
        data: {
          revokedAt: now,
          status: "REVOKED",
        },
        where: { id: paymentRequest.subscription.id },
      });

      await tx.deviceSlot.updateMany({
        data: {
          status: "BLOCKED",
        },
        where: {
          subscriptionId: paymentRequest.subscription.id,
        },
      });
    }
  });

  let integrationNotice = "";

  if (paymentRequest.subscription?.id) {
    const revokeResult = await revokeSubscriptionInXui(paymentRequest.subscription.id);

    if (!revokeResult.ok) {
      integrationNotice =
        " Локально подписка отозвана, но отключение в Marzban завершилось ошибкой.";
    }
  }

  revalidatePath("/admin");
  revalidatePath("/app");
  redirect(
    buildRedirectUrl({
      anchor: "#payments",
      notice: `Заявка отклонена. Подписка отозвана.${integrationNotice}`,
    })
  );
}
