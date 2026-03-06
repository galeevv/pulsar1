import { CreditCard, Landmark, Tags } from "lucide-react";

import { confirmTariffPaymentAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { AppSectionShell } from "./app-section-shell";
import { AppSurface } from "./app-surface";

type TariffItem = {
  deviceLimit: number;
  devicePriceRub: number;
  id: string;
  name: string;
  periodMonths: number;
  priceRub: number;
};

const PAYMENT_DETAILS = {
  bankName: "Т-Банк",
  cardNumber: "2200 7001 2345 6789",
  cardOwner: "PULSAR SERVICE",
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

function getTariffTotalPrice(tariff: TariffItem) {
  return tariff.priceRub * tariff.periodMonths + tariff.devicePriceRub * tariff.deviceLimit;
}

export function AppTariffsSection({
  tariffs,
}: {
  tariffs: TariffItem[];
}) {
  return (
    <AppSectionShell
      description="Выберите план, выполните перевод и подтвердите оплату."
      eyebrow="PLANS"
      id="tariffs"
      title="Выбор тарифа"
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
                <p className="text-2xl font-semibold tracking-tight">{plan.priceRub} ₽ / мес.</p>
                <p className="text-sm text-muted-foreground">
                  {plan.devicePriceRub} ₽ / устройство • {plan.deviceLimit}{" "}
                  {plan.deviceLimit === 1 ? "устройство" : "устройств"}
                </p>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="h-button w-full px-button-x" radius="card" type="button">
                      {getTariffTotalPrice(plan)} ₽
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{plan.name}</DialogTitle>
                      <DialogDescription>
                        К оплате: {getTariffTotalPrice(plan)} ₽ за {getPeriodLabel(plan.periodMonths)}.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
                      <div className="flex items-start gap-2">
                        <Landmark className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Банк</p>
                          <p className="text-sm text-muted-foreground">{PAYMENT_DETAILS.bankName}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CreditCard className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Карта</p>
                          <p className="text-sm text-muted-foreground">
                            {PAYMENT_DETAILS.cardNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {PAYMENT_DETAILS.cardOwner}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      После перевода нажмите «Оплачено». Доступ будет активирован сразу.
                    </p>

                    <form action={confirmTariffPaymentAction}>
                      <input name="tariffId" type="hidden" value={plan.id} />
                      <Button className="h-button w-full px-button-x" radius="card" type="submit">
                        Оплачено
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
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
