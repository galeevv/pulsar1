import { Activity, Gauge, Logs, Shield, Smartphone } from "lucide-react";

import { updateServiceCapacitySettingsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { AdminSectionShell } from "./admin-section-shell";
import { AdminSurface } from "./admin-surface";

type SubscriptionPreview = {
  createdAt: Date;
  id: string;
  periodMonths: number;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  tariffName: string;
  user: {
    username: string;
  };
};

function formatDate(value: Date) {
  return value.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: SubscriptionPreview["status"]) {
  if (status === "ACTIVE") {
    return "Активна";
  }

  if (status === "EXPIRED") {
    return "Истекла";
  }

  return "Отозвана";
}

export function AdminOperationsSection({
  deviceSlotStats,
  recentSubscriptions,
  serviceCapacitySettings,
  subscriptionStats,
}: {
  deviceSlotStats: {
    active: number;
    blocked: number;
    free: number;
  };
  recentSubscriptions: SubscriptionPreview[];
  serviceCapacitySettings: {
    maxActiveSubscriptions: number;
    migrationBannerEnabled: boolean;
    migrationBannerText: string;
    migrationBannerTitle: string;
  };
  subscriptionStats: {
    active: number;
    expired: number;
    revoked: number;
  };
}) {
  const activeUsersCount = subscriptionStats.active;
  const maxActiveSubscriptions = serviceCapacitySettings.maxActiveSubscriptions;
  const seatsLeft =
    maxActiveSubscriptions > 0 ? Math.max(0, maxActiveSubscriptions - activeUsersCount) : null;

  const subscriptionPreview = [
    {
      icon: Shield,
      label: "Активные",
      text: "Действующие подписки с доступом",
      value: `${subscriptionStats.active}`,
    },
    {
      icon: Gauge,
      label: "Истекшие",
      text: "Подписки завершили срок",
      value: `${subscriptionStats.expired}`,
    },
    {
      icon: Activity,
      label: "Отозвано",
      text: "Отключены вручную",
      value: `${subscriptionStats.revoked}`,
    },
  ];

  const devicePreview = [
    { label: "Активные слоты", value: `${deviceSlotStats.active}` },
    { label: "Свободные слоты", value: `${deviceSlotStats.free}` },
    { label: "Заблокировано", value: `${deviceSlotStats.blocked}` },
  ];

  return (
    <AdminSectionShell
      description="Операционные метрики по подпискам и устройствам, журнал последних событий и глобальный лимит `MAX_ACTIVE_SUBSCRIPTIONS`."
      eyebrow="OPERATIONS"
      id="operations"
      title="Подписки, устройства и журнал"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="grid gap-6 md:grid-cols-2">
          <AdminSurface>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Подписки</h3>
              </div>
              {subscriptionPreview.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className="rounded-card border border-border/70 bg-background/45 p-card-compact md:p-card-compact-md"
                    key={item.label}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {item.label}
                      </p>
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">{item.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </AdminSurface>

          <AdminSurface>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Device Slots</h3>
              </div>
              {devicePreview.map((item) => (
                <div
                  className="rounded-card border border-border/70 bg-background/45 p-card-compact md:p-card-compact-md"
                  key={item.label}
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">{item.value}</p>
                </div>
              ))}
            </div>
          </AdminSurface>
        </div>

        <AdminSurface>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Logs className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Последние события</h3>
            </div>

            {recentSubscriptions.length ? (
              recentSubscriptions.map((item) => (
                <div
                  className="rounded-card border border-border/70 bg-background/45 p-card-compact md:p-card-compact-md"
                  key={item.id}
                >
                  <p className="text-sm font-medium">{item.user.username}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.tariffName}, {item.periodMonths} мес. • статус {statusLabel(item.status)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-card border border-dashed border-border/70 bg-background/30 px-4 py-12 text-center text-sm text-muted-foreground">
                Событий по подпискам пока нет.
              </div>
            )}
          </div>
        </AdminSurface>
      </div>

      <div className="mt-6">
        <AdminSurface>
          <form action={updateServiceCapacitySettingsAction} className="space-y-4">
            <input
              name="migrationBannerEnabled"
              type="hidden"
              value={serviceCapacitySettings.migrationBannerEnabled ? "on" : ""}
            />
            <input
              name="migrationBannerTitle"
              type="hidden"
              value={serviceCapacitySettings.migrationBannerTitle}
            />
            <input
              name="migrationBannerText"
              type="hidden"
              value={serviceCapacitySettings.migrationBannerText}
            />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">MAX_ACTIVE_SUBSCRIPTIONS</h3>
              <p className="text-sm text-muted-foreground">
                Глобальный ceiling на число пользователей со статусом подписки `ACTIVE`. Продления
                существующих клиентов разрешены даже при заполненном лимите.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:items-center">
              <Input
                defaultValue={maxActiveSubscriptions}
                min="0"
                name="maxActiveSubscriptions"
                type="number"
              />
              <p className="text-sm text-muted-foreground">
                {maxActiveSubscriptions === 0
                  ? `Лимит отключен. Сейчас активных: ${activeUsersCount}.`
                  : `Сейчас активных: ${activeUsersCount} из ${maxActiveSubscriptions}. Свободно: ${seatsLeft}.`}
              </p>
            </div>

            <Button className="h-button px-button-x" radius="card" type="submit">
              Сохранить лимит
            </Button>
          </form>
        </AdminSurface>
      </div>

      <div className="mt-6">
        <AdminSurface>
          <form action={updateServiceCapacitySettingsAction} className="space-y-4">
            <input name="maxActiveSubscriptions" type="hidden" value={maxActiveSubscriptions} />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Migration banner</h3>
              <p className="text-sm text-muted-foreground">
                Сообщение в кабинете пользователя для перевыпуска VPN-ссылки после миграции.
              </p>
            </div>

            <label className="flex items-center gap-3 rounded-card border border-border/70 bg-background/45 p-3 text-sm">
              <input
                className="size-4 accent-primary"
                defaultChecked={serviceCapacitySettings.migrationBannerEnabled}
                name="migrationBannerEnabled"
                type="checkbox"
              />
              Показывать banner в /app
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="migrationBannerTitle">
                  Заголовок
                </label>
                <Input
                  defaultValue={serviceCapacitySettings.migrationBannerTitle}
                  id="migrationBannerTitle"
                  maxLength={120}
                  name="migrationBannerTitle"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="migrationBannerText">
                  Текст
                </label>
                <Textarea
                  className="min-h-24"
                  defaultValue={serviceCapacitySettings.migrationBannerText}
                  id="migrationBannerText"
                  maxLength={600}
                  name="migrationBannerText"
                />
              </div>
            </div>

            <Button className="h-button px-button-x" radius="card" type="submit">
              Сохранить banner
            </Button>
          </form>
        </AdminSurface>
      </div>
    </AdminSectionShell>
  );
}
