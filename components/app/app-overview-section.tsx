import { BadgeCheck, CalendarClock, Link2, Send, Smartphone, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AppCopySubscriptionButton } from "./app-copy-subscription-button";
import { AppSectionShell } from "./app-section-shell";
import { AppSetupDialog } from "./app-setup-dialog";
import { AppStatusPill } from "./app-status-pill";
import { AppSurface } from "./app-surface";

type ActiveSubscriptionItem = {
  deviceLimit: number;
  deviceSlots: Array<{
    id: string;
    label: string | null;
    slotIndex: number;
    status: "ACTIVE" | "BLOCKED" | "FREE";
  }>;
  devices: number;
  endsAt: Date;
  expiresAt: Date | null;
  paymentRequest: {
    status: "APPROVED" | "CREATED" | "MARKED_PAID" | "REJECTED";
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

function mapSlotStatus(status: "ACTIVE" | "BLOCKED" | "FREE") {
  if (status === "ACTIVE") {
    return "Подключено";
  }

  if (status === "BLOCKED") {
    return "Заблокировано";
  }

  return "Свободно";
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
      description="Основная сводка аккаунта: баланс, состояние подписки и быстрые действия для подключения."
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
              <div className="space-y-2 break-words text-sm text-muted-foreground">
                <p>
                  Username: <span className="break-all font-medium text-foreground">{username}</span>
                </p>
                <p>
                  Баланс: <span className="font-medium text-foreground">{credits} кредитов</span>
                </p>
                <p>
                  Всего приглашено: <span className="font-medium text-foreground">{referralStats.totalInvitedCount}</span>
                </p>
                <p>
                  Активные пользователи: <span className="font-medium text-foreground">{referralStats.activeInvitedCount}</span>
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
                  <Link2 className="size-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Ссылка подписки</p>
                </div>
                <AppCopySubscriptionButton subscriptionUrl={activeSubscription?.subscriptionUrl ?? null} />
              </div>

              <AppSetupDialog subscriptionUrl={activeSubscription?.subscriptionUrl ?? null} />
            </div>
          </AppSurface>
        </div>

        <AppSurface className="min-w-0">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="size-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Устройства</p>
            </div>

            {activeSubscription ? (
              <>
                <div className="space-y-2">
                  {activeSubscription.deviceSlots.map((slot) => (
                    <div
                      className="flex flex-col gap-3 rounded-card border border-border bg-background/50 p-card-compact md:flex-row md:items-center md:justify-between md:p-card-compact-md"
                      key={slot.id}
                    >
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-foreground">
                          {slot.label ?? `Устройство ${slot.slotIndex}`}
                        </p>
                        <p className="text-muted-foreground">Статус: {mapSlotStatus(slot.status)}</p>
                      </div>
                      <Button className="h-button px-button-x" disabled radius="card" type="button" variant="outline">
                        Удалить (скоро)
                      </Button>
                    </div>
                  ))}
                </div>

                <Button className="h-button w-full px-button-x" disabled radius="card" type="button" variant="outline">
                  Добавить устройство (скоро)
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Блок устройств станет доступен после активации первой подписки.
              </p>
            )}
          </div>
        </AppSurface>
      </div>
    </AppSectionShell>
  );
}
