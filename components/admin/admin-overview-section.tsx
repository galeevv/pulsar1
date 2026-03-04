import { BadgeCheck, CreditCard, KeyRound, Users } from "lucide-react";

import { AdminSectionShell } from "./admin-section-shell";
import { AdminSurface } from "./admin-surface";

const metricCards = [
  { label: "Пользователи", value: "128", meta: "+6 за неделю", icon: Users },
  { label: "Активные коды", value: "23", meta: "Invite, referral и promo", icon: KeyRound },
  { label: "Платежи на проверке", value: "7", meta: "3 требуют ручного решения", icon: CreditCard },
  { label: "Активные подписки", value: "91", meta: "4 истекают сегодня", icon: BadgeCheck },
];

export function AdminOverviewSection() {
  return (
    <AdminSectionShell
      description="Это визуальный каркас админки: секции, якорная навигация и реальные блоки для управления кодами. Следующим этапом сюда будем последовательно добавлять CRUD по тарифам, платежам и подпискам."
      eyebrow="CONTROL PANEL"
      id="overview"
      title="Панель управления сервисом"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((item) => {
          const Icon = item.icon;

          return (
            <AdminSurface key={item.label}>
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
            </AdminSurface>
          );
        })}
      </div>
    </AdminSectionShell>
  );
}
