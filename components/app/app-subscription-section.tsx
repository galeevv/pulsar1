import { Button } from "@/components/ui/button";

import { AppSectionShell } from "./app-section-shell";
import { AppStatusPill } from "./app-status-pill";
import { AppSurface } from "./app-surface";

type SubscriptionItem = {
  endsAt: Date;
  id: string;
  periodMonths: number;
  startedAt: Date;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  subscriptionUrl: string | null;
  tariffName: string;
};

function formatDate(date: Date) {
  return date.toLocaleDateString("ru-RU");
}

function mapStatus(status: SubscriptionItem["status"]) {
  if (status === "ACTIVE") {
    return { label: "Активна", tone: "success" as const };
  }

  if (status === "EXPIRED") {
    return { label: "Истекла", tone: "default" as const };
  }

  return { label: "Отозвана", tone: "default" as const };
}

export function AppSubscriptionSection({
  activeSubscription,
  latestSubscriptions,
}: {
  activeSubscription: SubscriptionItem | null;
  latestSubscriptions: SubscriptionItem[];
}) {
  return (
    <AppSectionShell
      description="После подтвержденной оплаты подписка создается автоматически. Здесь отображаются срок действия, статус и история последних подписок."
      eyebrow="SUBSCRIPTION"
      id="subscription"
      title="Подписка"
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <AppSurface>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Текущий доступ</p>
              <AppStatusPill
                label={activeSubscription ? "Активен" : "Нет активной подписки"}
                tone={activeSubscription ? "success" : "default"}
              />
            </div>

            {activeSubscription ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Тариф: {activeSubscription.tariffName}</p>
                <p>Старт: {formatDate(activeSubscription.startedAt)}</p>
                <p>Окончание: {formatDate(activeSubscription.endsAt)}</p>
                <p>Период: {activeSubscription.periodMonths} мес.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Активной подписки пока нет. Создайте заявку на оплату, отметьте «Оплачено» и
                дождитесь подтверждения администратора.
              </p>
            )}
          </div>
        </AppSurface>

        <AppSurface>
          <div className="space-y-4">
            <p className="text-sm font-semibold">Ссылка подписки</p>
            <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
              <p className="break-all text-sm text-muted-foreground">
                {activeSubscription?.subscriptionUrl ??
                  "Появится после подключения выдачи доступа через Marzban."}
              </p>
            </div>

            <Button
              className="h-button w-full px-button-x"
              disabled={!activeSubscription?.subscriptionUrl}
              radius="card"
              type="button"
              variant="outline"
            >
              Скопировать ссылку
            </Button>

            <div className="space-y-3">
              <p className="text-sm font-semibold">Последние подписки</p>
              {latestSubscriptions.length ? (
                latestSubscriptions.map((item) => {
                  const status = mapStatus(item.status);

                  return (
                    <div
                      className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md"
                      key={item.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{item.tariffName}</p>
                        <AppStatusPill label={status.label} tone={status.tone} />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {formatDate(item.startedAt)} — {formatDate(item.endsAt)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">Подписок пока еще не было.</p>
              )}
            </div>
          </div>
        </AppSurface>
      </div>
    </AppSectionShell>
  );
}
