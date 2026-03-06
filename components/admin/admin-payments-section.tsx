import { approvePaymentRequestAction, rejectPaymentRequestAction } from "@/app/admin/payment-actions";
import { Button } from "@/components/ui/button";

import { AdminSectionShell } from "./admin-section-shell";
import { AdminStatusPill } from "./admin-status-pill";
import { AdminSurface } from "./admin-surface";

type PaymentRequestItem = {
  amountRub: number;
  createdAt: Date;
  deviceLimit: number;
  id: string;
  periodMonths: number;
  status: "APPROVED" | "CREATED" | "MARKED_PAID" | "REJECTED";
  tariffName: string;
  user: {
    username: string;
  };
};

function getStatusMeta(status: PaymentRequestItem["status"]) {
  if (status === "MARKED_PAID") {
    return {
      label: "Оплачено",
      note: "Подписка уже выдана автоматически. Проверьте перевод и подтвердите или отклоните.",
      tone: "warning" as const,
    };
  }

  if (status === "APPROVED") {
    return {
      label: "Подтвержден",
      note: "Платеж подтвержден администратором.",
      tone: "success" as const,
    };
  }

  if (status === "REJECTED") {
    return {
      label: "Отклонен",
      note: "Оплата не подтверждена. Подписка отозвана.",
      tone: "default" as const,
    };
  }

  return {
    label: "Создан",
    note: "Заявка создана и ждет кнопку «Оплачено» от пользователя.",
    tone: "default" as const,
  };
}

export function AdminPaymentsSection({
  paymentRequests,
}: {
  paymentRequests: PaymentRequestItem[];
}) {
  return (
    <AdminSectionShell
      description="Очередь ручной проверки переводов. После «Оплачено» у пользователя доступ активируется сразу, а админ подтверждает факт оплаты или отзывает доступ."
      eyebrow="PAYMENTS"
      id="payments"
      title="Платежи"
    >
      {paymentRequests.length ? (
        <div className="space-y-4">
          {paymentRequests.map((item) => {
            const meta = getStatusMeta(item.status);
            const isFinal = item.status === "APPROVED" || item.status === "REJECTED";
            const canReview = item.status === "MARKED_PAID";

            return (
              <AdminSurface key={item.id}>
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{item.user.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.tariffName} • {item.periodMonths} мес. • {item.deviceLimit} устройств
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <AdminStatusPill label={meta.label} tone={meta.tone} />
                      <p className="text-lg font-semibold">{item.amountRub} ₽</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">{meta.note}</p>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <form action={approvePaymentRequestAction}>
                      <input name="id" type="hidden" value={item.id} />
                      <Button
                        className="h-button px-button-x"
                        disabled={isFinal || !canReview}
                        radius="card"
                        type="submit"
                      >
                        Подтвердить
                      </Button>
                    </form>

                    <form action={rejectPaymentRequestAction}>
                      <input name="id" type="hidden" value={item.id} />
                      <Button
                        className="h-button px-button-x"
                        disabled={isFinal || !canReview}
                        radius="card"
                        type="submit"
                        variant="outline"
                      >
                        Отклонить
                      </Button>
                    </form>
                  </div>
                </div>
              </AdminSurface>
            );
          })}
        </div>
      ) : (
        <AdminSurface>
          <p className="text-sm text-muted-foreground">
            Платежных заявок пока нет. Как только пользователь создаст заявку в `/app`, она появится здесь.
          </p>
        </AdminSurface>
      )}
    </AdminSectionShell>
  );
}
