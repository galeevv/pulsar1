import { Tags } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AppSectionShell } from "./app-section-shell";
import { AppSurface } from "./app-surface";

type TariffItem = {
  deviceLimit: number;
  id: string;
  name: string;
  periodMonths: number;
  priceRub: number;
};

function getPeriodLabel(periodMonths: number) {
  if (periodMonths === 1) {
    return "1 месяц";
  }

  if (periodMonths >= 2 && periodMonths <= 4) {
    return `${periodMonths} месяца`;
  }

  return `${periodMonths} месяцев`;
}

export function AppTariffsSection({
  tariffs,
}: {
  tariffs: TariffItem[];
}) {
  return (
    <AppSectionShell
      description="Здесь пользователь видит реальные тарифы из базы данных и сможет выбрать нужный вариант перед созданием платежной заявки."
      eyebrow="TARIFFS"
      id="tariffs"
      title="Тарифы"
    >
      {tariffs.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tariffs.map((plan) => (
            <AppSurface key={plan.id}>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{plan.name}</p>
                  <Tags className="size-4 text-muted-foreground" />
                </div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {getPeriodLabel(plan.periodMonths)}
                </p>
                <p className="text-2xl font-semibold tracking-tight">{plan.priceRub} ₽</p>
                <p className="text-sm text-muted-foreground">
                  {plan.deviceLimit} {plan.deviceLimit === 1 ? "устройство" : "устройств"}
                </p>
                <Button className="h-button w-full px-button-x" radius="card" type="button">
                  Выбрать
                </Button>
              </div>
            </AppSurface>
          ))}
        </div>
      ) : (
        <AppSurface>
          <p className="text-sm text-muted-foreground">
            Сейчас нет активных тарифов. Как только администратор добавит их в `/admin`, они
            появятся здесь автоматически.
          </p>
        </AppSurface>
      )}
    </AppSectionShell>
  );
}
