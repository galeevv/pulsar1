import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function formatDate(value: Date) {
  return value.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusMeta(status: PaymentRequestItem["status"]) {
  if (status === "CREATED") {
    return {
      label: "Ожидает оплаты",
      tone: "warning" as const,
    };
  }

  if (status === "APPROVED") {
    return {
      label: "Подтвержден",
      tone: "success" as const,
    };
  }

  return {
    label: "Отклонен",
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
      description="История заявок на оплату через Platega и внутренние кредиты. Блок отображает метод, параметры подписки и фактический статус платежа."
      eyebrow="PAYMENTS"
      id="payments"
      title="Платежи"
    >
      <AdminSurface className="overflow-hidden p-0">
        {paymentRequests.length ? (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/70">
                    <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Пользователь
                    </TableHead>
                    <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Подписка
                    </TableHead>
                    <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Метод
                    </TableHead>
                    <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Статус
                    </TableHead>
                    <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Сумма
                    </TableHead>
                    <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Создан
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentRequests.map((item) => {
                    const status = getStatusMeta(item.status);

                    return (
                      <TableRow className="border-border/70 hover:bg-background/45" key={item.id}>
                        <TableCell className="px-6 py-4 font-medium">{item.user.username}</TableCell>
                        <TableCell className="px-6 py-4 text-muted-foreground">
                          {item.tariffName} • {item.months} мес. • {item.devices} устройств
                        </TableCell>
                        <TableCell className="px-6 py-4 text-muted-foreground">
                          {item.method === "CREDITS" ? "Credits" : "Platega"}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <AdminStatusPill label={status.label} tone={status.tone} />
                        </TableCell>
                        <TableCell className="px-6 py-4 font-semibold">{item.amountRub} ₽</TableCell>
                        <TableCell className="px-6 py-4 text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 p-card md:hidden">
              {paymentRequests.map((item) => {
                const status = getStatusMeta(item.status);

                return (
                  <div
                    className="space-y-3 rounded-card border border-border/70 bg-background/45 p-card-compact"
                    key={item.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{item.user.username}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                      </div>
                      <AdminStatusPill label={status.label} tone={status.tone} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.tariffName} • {item.months} мес. • {item.devices} устройств
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.method === "CREDITS" ? "Credits" : "Platega"}
                      </span>
                      <span className="font-semibold">{item.amountRub} ₽</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground md:px-6">
            Платежных заявок пока нет.
          </div>
        )}
      </AdminSurface>
    </AdminSectionShell>
  );
}
