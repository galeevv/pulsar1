import { createPaymentRequestAction, markPaymentRequestPaidAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";

import { AppSectionShell } from "./app-section-shell";
import { AppStatusPill } from "./app-status-pill";
import { AppSurface } from "./app-surface";

type TariffItem = {
  deviceLimit: number;
  id: string;
  name: string;
  periodMonths: number;
  priceRub: number;
};

type PaymentRequestItem = {
  amountRub: number;
  createdAt: Date;
  deviceLimit: number;
  id: string;
  periodMonths: number;
  status: "APPROVED" | "CREATED" | "MARKED_PAID" | "REJECTED";
  tariffName: string;
};

function getStatusMeta(status: PaymentRequestItem["status"]) {
  if (status === "MARKED_PAID") {
    return {
      actionLabel: "Ожидает решения администратора",
      description:
        "Подписка уже активирована. Администратор проверит перевод и подтвердит или отклонит заявку.",
      label: "Оплачено",
      tone: "warning" as const,
    };
  }

  if (status === "APPROVED") {
    return {
      actionLabel: "Подтверждено",
      description: "Платеж подтвержден администратором.",
      label: "Подтвержден",
      tone: "success" as const,
    };
  }

  if (status === "REJECTED") {
    return {
      actionLabel: "Отклонено",
      description: "Оплата не подтверждена. Подписка отозвана.",
      label: "Отклонен",
      tone: "default" as const,
    };
  }

  return {
    actionLabel: "Оплачено",
    description:
      "Переведите сумму по реквизитам администратора и после перевода нажмите «Оплачено».",
    label: "Создана",
    tone: "default" as const,
  };
}

export function AppPaymentsSection({
  openPaymentRequest,
  paymentRequests,
  tariffs,
}: {
  openPaymentRequest: PaymentRequestItem | null;
  paymentRequests: PaymentRequestItem[];
  tariffs: TariffItem[];
}) {
  const openMeta = openPaymentRequest ? getStatusMeta(openPaymentRequest.status) : null;

  return (
    <AppSectionShell
      description="Ручной контур оплаты: заявка создается по тарифу, после кнопки «Оплачено» доступ активируется сразу, а админ позже подтверждает или отклоняет платеж."
      eyebrow="PAYMENTS"
      id="payments"
      title="Оплата"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <AppSurface>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Текущая заявка</p>
              <p className="text-sm text-muted-foreground">
                Один открытый платежный сценарий за раз.
              </p>
            </div>

            {openPaymentRequest ? (
              <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{openPaymentRequest.tariffName}</p>
                    <p className="text-sm text-muted-foreground">
                      {openPaymentRequest.periodMonths} мес. • {openPaymentRequest.deviceLimit} устройств
                    </p>
                  </div>
                  <AppStatusPill label={openMeta!.label} tone={openMeta!.tone} />
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  К оплате: {openPaymentRequest.amountRub} ₽.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{openMeta!.description}</p>
              </div>
            ) : (
              <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
                <p className="text-sm text-muted-foreground">
                  Открытой заявки нет. Ниже можно создать новую по активному тарифу.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm font-semibold">История заявок</p>
              {paymentRequests.length ? (
                paymentRequests.map((item) => {
                  const meta = getStatusMeta(item.status);

                  return (
                    <div
                      key={item.id}
                      className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">{item.tariffName}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.amountRub} ₽ • {item.periodMonths} мес.
                          </p>
                        </div>
                        <AppStatusPill label={meta.label} tone={meta.tone} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
                  <p className="text-sm text-muted-foreground">Заявок пока еще не было.</p>
                </div>
              )}
            </div>
          </div>
        </AppSurface>

        <AppSurface>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Статус оплаты</p>
              <AppStatusPill
                label={openMeta ? openMeta.label : "Нет заявки"}
                tone={openMeta ? openMeta.tone : "default"}
              />
            </div>

            <div className="space-y-3">
              {tariffs.length ? (
                tariffs.map((tariff) => (
                  <form action={createPaymentRequestAction} key={tariff.id}>
                    <input name="tariffId" type="hidden" value={tariff.id} />
                    <Button
                      className="h-button w-full justify-between px-button-x"
                      disabled={Boolean(openPaymentRequest)}
                      radius="card"
                      type="submit"
                      variant="outline"
                    >
                      <span>{tariff.name}</span>
                      <span>{tariff.priceRub} ₽</span>
                    </Button>
                  </form>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Нет активных тарифов для создания заявки.
                </p>
              )}
            </div>

            {openPaymentRequest ? (
              <form action={markPaymentRequestPaidAction}>
                <input name="paymentRequestId" type="hidden" value={openPaymentRequest.id} />
                <Button
                  className="h-button w-full px-button-x"
                  disabled={openPaymentRequest.status !== "CREATED"}
                  radius="card"
                  type="submit"
                >
                  {openMeta!.actionLabel}
                </Button>
              </form>
            ) : null}
          </div>
        </AppSurface>
      </div>
    </AppSectionShell>
  );
}
