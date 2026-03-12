import { AdminSectionShell } from "./admin-section-shell";
import { AdminStatusPill } from "./admin-status-pill";
import { AdminSurface } from "./admin-surface";

type PaymentRequestItem = {
  amountRub: number;
  createdAt: Date;
  devices: number;
  id: string;
  method: "CREDITS" | "PLATEGA";
  months: number;
  status: "APPROVED" | "CREATED" | "REJECTED";
  tariffName: string;
  user: {
    username: string;
  };
};

function getStatusMeta(status: PaymentRequestItem["status"]) {
  if (status === "CREATED") {
    return {
      label: "Ожидает оплаты",
      note: "Платеж создан, ожидается подтверждение от провайдера оплаты.",
      tone: "default" as const,
    };
  }

  if (status === "APPROVED") {
    return {
      label: "Подтвержден",
      note: "Платеж подтвержден системой.",
      tone: "success" as const,
    };
  }

  return {
    label: "Отклонен",
    note: "Оплата не подтверждена. Подписка не активирована или отозвана.",
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
      description="История платежей по методам Platega и кредиты."
      eyebrow="PAYMENTS"
      id="payments"
      title="Платежи"
    >
      {paymentRequests.length ? (
        <div className="space-y-4">
          {paymentRequests.map((item) => {
            const meta = getStatusMeta(item.status);

            return (
              <AdminSurface key={item.id}>
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{item.user.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.tariffName} • {item.months} мес. • {item.devices} устройств •{" "}
                        {item.method === "CREDITS" ? "credits" : "platega"}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <AdminStatusPill label={meta.label} tone={meta.tone} />
                      <p className="text-lg font-semibold">{item.amountRub} ₽</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">{meta.note}</p>
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
