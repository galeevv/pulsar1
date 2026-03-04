import { BadgeCheck, CreditCard, Shield, Wallet } from "lucide-react";

import { AppSectionShell } from "./app-section-shell";
import { AppSurface } from "./app-surface";

export function AppOverviewSection({
  credits,
}: {
  credits: number;
}) {
  const metricCards = [
    { label: "Баланс", value: `${credits}`, meta: "Доступно кредитов", icon: Wallet },
    { label: "Статус", value: "ACTIVE", meta: "Доступ разрешен", icon: BadgeCheck },
    { label: "Первая скидка", value: "50%", meta: "По referral-коду", icon: CreditCard },
    { label: "Подписка", value: "MVP", meta: "Появится после первой оплаты", icon: Shield },
  ];

  return (
    <AppSectionShell
      description="Это каркас пользовательского кабинета. Здесь будет управление доступом, оплатой, подпиской, устройствами и бонусными механиками."
      eyebrow="CABINET"
      id="overview"
      title="Личный кабинет"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((item) => {
          const Icon = item.icon;

          return (
            <AppSurface key={item.label}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="text-3xl font-semibold tracking-tight">{item.value}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-card border border-border bg-background/60">
                  <Icon className="size-4" />
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{item.meta}</p>
            </AppSurface>
          );
        })}
      </div>
    </AppSectionShell>
  );
}
