import { BadgeCheck, CalendarClock, Link2, Send, Wallet } from "lucide-react";

import { AppCopySubscriptionButton } from "./app-copy-subscription-button";
import { AppSectionShell } from "./app-section-shell";
import { AppSetupDialog } from "./app-setup-dialog";
import { AppStatusPill } from "./app-status-pill";
import { AppSurface } from "./app-surface";

type ActiveSubscriptionItem = {
  endsAt: Date;
  startedAt: Date;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  subscriptionUrl: string | null;
  tariffName: string;
} | null;

type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

function formatDate(date: Date) {
  return date.toLocaleDateString("ru-RU");
}

function mapSubscriptionStatus(status: SubscriptionStatus) {
  if (status === "ACTIVE") {
    return { label: "Активна", tone: "success" as const };
  }

  if (status === "EXPIRED") {
    return { label: "Истекла", tone: "default" as const };
  }

  return { label: "Отозвана", tone: "default" as const };
}

export function AppOverviewSection({
  activeSubscription,
  credits,
  referralStats,
  username,
}: {
  activeSubscription: ActiveSubscriptionItem;
  credits: number;
  referralStats: {
    activeInvitedCount: number;
    totalInvitedCount: number;
  };
  username: string;
}) {
  const subscriptionStatus = activeSubscription
    ? mapSubscriptionStatus(activeSubscription.status)
    : { label: "Нет подписки", tone: "default" as const };

  return (
    <AppSectionShell
      description="Основная сводка аккаунта: текущий баланс, состояние подписки и быстрые действия для подключения."
      eyebrow="ACCOUNT OVERVIEW"
      id="dashboard"
      title="Dashboard"
    >
      <div className="grid gap-4 lg:grid-cols-[373.33px_minmax(0,1fr)]">
        <AppSurface className="min-w-0">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Аккаунт</p>
            </div>
            <div className="space-y-2 break-words text-sm text-muted-foreground">
              <p>
                Username: <span className="break-all font-medium text-foreground">{username}</span>
              </p>
              <p>
                Баланс: <span className="font-medium text-foreground">{credits} кредитов</span>
              </p>
              <p>
                Всего приглашено:{" "}
                <span className="font-medium text-foreground">{referralStats.totalInvitedCount}</span>
              </p>
              <p>
                Активные пользователи:{" "}
                <span className="font-medium text-foreground">{referralStats.activeInvitedCount}</span>
              </p>
            </div>
            <a
              className="inline-flex items-center gap-2 break-all text-sm text-foreground underline-offset-4 hover:underline"
              href="https://t.me/pulsar_space"
              rel="noreferrer"
              target="_blank"
            >
              <Send className="size-4" />
              Мы в телеграме
            </a>
          </div>
        </AppSurface>

        <AppSurface className="min-w-0">
          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Подписка</p>
              </div>
              <AppStatusPill label={subscriptionStatus.label} tone={subscriptionStatus.tone} />
            </div>

            {activeSubscription ? (
              <p className="break-words text-sm text-muted-foreground">
                Тариф: {activeSubscription.tariffName} • Старт: {formatDate(activeSubscription.startedAt)} •
                Окончание: {formatDate(activeSubscription.endsAt)}
              </p>
            ) : (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <CalendarClock className="mt-0.5 size-4 shrink-0" />
                <p>Активной подписки нет. Выберите тариф ниже и подтвердите оплату.</p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Link2 className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium">Ссылка подписки</p>
              </div>
              <AppCopySubscriptionButton subscriptionUrl={activeSubscription?.subscriptionUrl ?? null} />
            </div>

            <AppSetupDialog subscriptionUrl={activeSubscription?.subscriptionUrl ?? null} />
          </div>
        </AppSurface>
      </div>
    </AppSectionShell>
  );
}
