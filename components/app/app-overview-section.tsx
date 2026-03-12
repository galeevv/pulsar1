import { BadgeCheck, CalendarClock, Send, Smartphone, UserPlus, UserRound, Users, Wallet } from "lucide-react";

import { SupportDialog } from "@/components/support/support-dialog";

import { AppDevicesManagementDialog } from "./app-devices-management-dialog";
import { AppSectionShell } from "./app-section-shell";
import { AppSetupDialog } from "./app-setup-dialog";
import { AppStatusPill } from "./app-status-pill";
import { AppSurface } from "./app-surface";
import { AppUserAgreementDialog } from "./app-user-agreement-dialog";

type ActiveSubscriptionItem = {
  deviceLimit: number;
  deviceSlots: Array<{
    configUrl: string | null;
    id: string;
    label: string | null;
    lastSyncError: string | null;
    slotIndex: number;
    status: "ACTIVE" | "BLOCKED" | "FREE";
  }>;
  devices: number;
  endsAt: Date;
  expiresAt: Date | null;
  paymentRequest: {
    status: "APPROVED" | "CREATED" | "REJECTED";
  } | null;
  startsAt: Date | null;
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
  userAgreementText,
  username,
}: {
  activeSubscription: ActiveSubscriptionItem;
  credits: number;
  referralStats: {
    activeInvitedCount: number;
    totalInvitedCount: number;
  };
  userAgreementText: string;
  username: string;
}) {
  const subscriptionStatus = activeSubscription
    ? mapSubscriptionStatus(activeSubscription.status)
    : { label: "Нет подписки", tone: "default" as const };
  const subscriptionStart = activeSubscription
    ? activeSubscription.startsAt ?? activeSubscription.startedAt
    : null;
  const subscriptionEnd = activeSubscription
    ? activeSubscription.expiresAt ?? activeSubscription.endsAt
    : null;
  const devicesCount = activeSubscription
    ? Math.max(activeSubscription.devices, activeSubscription.deviceLimit)
    : 0;
  return (
    <AppSectionShell
      description="Основная сводка аккаунта: баланс, статус подписки и быстрые действия для подключения и управления."
      eyebrow="ACCOUNT OVERVIEW"
      id="dashboard"
      title="Dashboard"
    >
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[373.33px_minmax(0,1fr)]">
          <AppSurface className="min-w-0">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wallet className="size-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Аккаунт и баланс</p>
              </div>
              <div className="rounded-card border border-border/70 bg-background/40 p-card-compact md:p-card-compact-md">
                <div className="flex items-start gap-2">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-card border border-border bg-background/60">
                    <UserRound className="size-4 text-foreground" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Профиль</p>
                    <p className="break-all text-sm font-semibold text-foreground">{username}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-card border border-border/70 bg-background/30 px-3 py-2">
                    <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Wallet className="size-3.5" />
                      Баланс
                    </p>
                    <p className="text-sm font-semibold text-foreground">{credits} кредитов</p>
                  </div>
                  <div className="rounded-card border border-border/70 bg-background/30 px-3 py-2">
                    <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <UserPlus className="size-3.5" />
                      Приглашено
                    </p>
                    <p className="text-sm font-semibold text-foreground">{referralStats.totalInvitedCount}</p>
                  </div>
                  <div className="rounded-card border border-border/70 bg-background/30 px-3 py-2">
                    <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="size-3.5" />
                      Активные
                    </p>
                    <p className="text-sm font-semibold text-foreground">{referralStats.activeInvitedCount}</p>
                  </div>
                </div>
              </div>

              <a
                className="inline-flex h-button w-full items-center justify-center gap-2 rounded-card border border-border bg-background/40 px-button-x text-sm text-foreground transition-colors hover:bg-background/60"
                href="https://t.me/pulsar_space"
                rel="noreferrer"
                target="_blank"
              >
                <Send className="size-4" />
                Мы в Telegram
              </a>

              <div className="space-y-2">
                <AppUserAgreementDialog userAgreementText={userAgreementText} />
                <SupportDialog />
              </div>
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

              {activeSubscription && subscriptionStart && subscriptionEnd ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="break-words">
                    Тариф: <span className="font-medium text-foreground">{activeSubscription.tariffName}</span>
                  </p>
                  <p>
                    Старт: <span className="font-medium text-foreground">{formatDate(subscriptionStart)}</span> · Окончание:{" "}
                    <span className="font-medium text-foreground">{formatDate(subscriptionEnd)}</span>
                  </p>
                  <p>
                    Устройств: <span className="font-medium text-foreground">{devicesCount}</span>
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="mt-0.5 size-4 shrink-0" />
                  <p>Активной подписки нет. Соберите конфигурацию выше и подтвердите оплату.</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="size-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Устройства</p>
                </div>
                <AppDevicesManagementDialog activeSubscription={activeSubscription} />
              </div>

              <AppSetupDialog subscriptionUrl={activeSubscription?.subscriptionUrl ?? null} />
            </div>
          </AppSurface>
        </div>
      </div>
    </AppSectionShell>
  );
}
