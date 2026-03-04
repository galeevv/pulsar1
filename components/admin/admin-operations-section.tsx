import { Activity, Logs, Shield, Smartphone } from "lucide-react";

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
  subscriptionStats,
}: {
  deviceSlotStats: {
    active: number;
    blocked: number;
    free: number;
  };
  recentSubscriptions: SubscriptionPreview[];
  subscriptionStats: {
    active: number;
    expired: number;
    revoked: number;
  };
}) {
  const subscriptionPreview = [
    {
      label: "Активные",
      text: "Действующие подписки с доступом",
      value: `${subscriptionStats.active}`,
    },
    {
      label: "Истекшие",
      text: "Подписки завершили срок",
      value: `${subscriptionStats.expired}`,
    },
    {
      label: "Отозвано",
      text: "Подписки отключены вручную",
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
      description="Подписки и device slots теперь считаются из реальных данных. Здесь видны основные метрики и последние события по подпискам."
      eyebrow="OPERATIONS"
      id="operations"
      title="Подписки, устройства и журнал"
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <AdminSurface>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Подписки</h3>
            </div>
            {subscriptionPreview.map((item) => (
              <div
                className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md"
                key={item.label}
              >
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </AdminSurface>

        <AdminSurface>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Устройства</h3>
            </div>
            {devicePreview.map((item) => (
              <div
                className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md"
                key={item.label}
              >
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</p>
              </div>
            ))}
          </div>
        </AdminSurface>

        <AdminSurface>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Logs className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Журнал</h3>
            </div>
            {recentSubscriptions.length ? (
              recentSubscriptions.map((item) => (
                <div
                  className="flex gap-3 rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md"
                  key={item.id}
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-card border border-border bg-background/70">
                    <Activity className="size-4" />
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {item.user.username}: {item.tariffName}, {item.periodMonths} мес., статус{" "}
                    {statusLabel(item.status)}.
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
                <p className="text-sm text-muted-foreground">
                  Событий по подпискам пока нет.
                </p>
              </div>
            )}
          </div>
        </AdminSurface>
      </div>
    </AdminSectionShell>
  );
}
