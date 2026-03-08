"use client";

import { useMemo, useState } from "react";

import { CalendarClock, CreditCard, Landmark, Settings2, Smartphone } from "lucide-react";

import { confirmTariffPaymentAction, payTariffWithCreditsAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { calculateAppSubscriptionPreviewPrice } from "@/lib/subscription-preview";

import { AppSectionShell } from "./app-section-shell";
import { AppSurface } from "./app-surface";

type DurationRuleItem = {
  discountPercent: number;
  id: string;
  monthlyPrice: number;
  months: number;
};

type PricingSettings = {
  baseDeviceMonthlyPrice: number;
  extraDeviceMonthlyPrice: number;
  maxDevices: number;
  minDevices: number;
};

const PAYMENT_DETAILS = {
  bankName: "Т-Банк",
  cardNumber: "2200 7001 2345 6789",
  cardOwner: "PULSAR SERVICE",
};

function getMonthsLabel(months: number) {
  if (months === 1) {
    return "1 месяц";
  }

  if (months >= 2 && months <= 4) {
    return `${months} месяца`;
  }

  return `${months} месяцев`;
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("ru-RU");
}

function parseDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function AppTariffsSection({
  activeSubscriptionEndAtIso,
  activeSubscriptionStartAtIso,
  canExtendSubscription,
  credits,
  durationRules,
  firstPurchaseDiscountPct,
  pricingSettings,
}: {
  activeSubscriptionEndAtIso: string | null;
  activeSubscriptionStartAtIso: string | null;
  canExtendSubscription: boolean;
  credits: number;
  durationRules: DurationRuleItem[];
  firstPurchaseDiscountPct: number;
  pricingSettings: PricingSettings;
}) {
  const sortedRules = useMemo(
    () => [...durationRules].sort((a, b) => a.months - b.months),
    [durationRules]
  );
  const minimumDevices = pricingSettings.minDevices;
  const maximumDevices = pricingSettings.maxDevices;
  const isDeviceRangeValid = minimumDevices <= maximumDevices;
  const defaultDevices = Math.min(Math.max(3, minimumDevices), maximumDevices);

  const [selectedMonths, setSelectedMonths] = useState(sortedRules[0]?.months ?? 1);
  const [selectedDevices, setSelectedDevices] = useState(defaultDevices);

  const selectedRule = sortedRules.find((item) => item.months === selectedMonths) ?? sortedRules[0];
  const effectiveSelectedMonths = selectedRule?.months ?? sortedRules[0]?.months ?? 1;
  const effectiveSelectedDevices = Math.min(
    Math.max(selectedDevices, minimumDevices),
    maximumDevices
  );

  const calculatedPrice = selectedRule
    ? calculateAppSubscriptionPreviewPrice({
        devices: effectiveSelectedDevices,
        firstPurchaseDiscountPct,
        pricingSettings: {
          baseDeviceMonthlyPrice: pricingSettings.baseDeviceMonthlyPrice,
          extraDeviceMonthlyPrice: pricingSettings.extraDeviceMonthlyPrice,
        },
        rule: selectedRule,
      })
    : null;
  const totalAfterDurationDiscountDisplay = calculatedPrice?.totalAfterDurationDiscountRub ?? 0;
  const totalAfterReferralDiscountDisplay = calculatedPrice?.finalTotalRub ?? 0;

  const now = new Date();
  const previewStartBaseDate = parseDateOrNull(activeSubscriptionStartAtIso) ?? now;
  const previewEndBaseDate = parseDateOrNull(activeSubscriptionEndAtIso) ?? now;
  const previewEndsAt = addMonths(previewEndBaseDate, effectiveSelectedMonths);

  const checkoutDisabled =
    !canExtendSubscription || !isDeviceRangeValid || !selectedRule || !calculatedPrice;
  const hasEnoughCredits = calculatedPrice ? credits >= calculatedPrice.finalTotalRub : false;
  const hasReferralDiscount =
    firstPurchaseDiscountPct > 0 &&
    totalAfterReferralDiscountDisplay < totalAfterDurationDiscountDisplay;
  const totalSavings = calculatedPrice
    ? calculatedPrice.totalBeforeDiscountRub - calculatedPrice.finalTotalRub
    : 0;

  return (
    <AppSectionShell
      description="Настройте тариф: выберите срок и количество устройств."
      eyebrow="TARIFFS"
      id="tariffs"
      title="Покупка подписки"
    >
      <AppSurface>
        {sortedRules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Сейчас нет активных сроков подписки. Администратор может включить их в `/admin`.
          </p>
        ) : !isDeviceRangeValid ? (
          <p className="text-sm text-muted-foreground">
            Некорректные ограничения устройств в админке: минимальное значение больше максимального.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings2 className="size-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Срок подписки</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {sortedRules.map((item) => {
                  const isSelected = item.months === selectedMonths;
                  const itemPrice = calculateAppSubscriptionPreviewPrice({
                    devices: effectiveSelectedDevices,
                    firstPurchaseDiscountPct,
                    pricingSettings: {
                      baseDeviceMonthlyPrice: pricingSettings.baseDeviceMonthlyPrice,
                      extraDeviceMonthlyPrice: pricingSettings.extraDeviceMonthlyPrice,
                    },
                    rule: item,
                  });

                  return (
                    <Button
                      className="h-auto w-full rounded-card border p-4 text-left transition-colors data-[state=selected]:border-primary data-[state=selected]:bg-primary/10"
                      data-state={isSelected ? "selected" : "idle"}
                      key={item.id}
                      onClick={() => setSelectedMonths(item.months)}
                      radius="card"
                      type="button"
                      variant="outline"
                    >
                      <div className="grid w-full grid-cols-2 gap-3">
                        <div className="space-y-1 text-left">
                          <p className="text-base font-semibold">{getMonthsLabel(item.months)}</p>
                          <p className="text-sm text-muted-foreground">
                            {Math.round(itemPrice.finalTotalRub / item.months)} ₽/мес
                          </p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-base font-semibold">{itemPrice.finalTotalRub} ₽</p>
                          <p className="text-sm text-muted-foreground">-{item.discountPercent}%</p>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="size-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Количество устройств</p>
                </div>
                <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Количество устройств:{" "}
                      <span className="font-medium text-foreground">{effectiveSelectedDevices}</span>
                    </span>
                    <span>
                      {minimumDevices} - {maximumDevices}
                    </span>
                  </div>
                  <Slider
                    className="mt-3"
                    max={maximumDevices}
                    min={minimumDevices}
                    onValueChange={(value) => {
                      const next = Number(value[0] ?? minimumDevices);
                      setSelectedDevices(Math.min(Math.max(next, minimumDevices), maximumDevices));
                    }}
                    step={1}
                    value={[effectiveSelectedDevices]}
                  />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Устройства/мес:{" "}
                    <span className="font-medium text-foreground">
                      {calculatedPrice?.devicesMonthlyPrice ?? 0} ₽
                    </span>
                  </p>
                </div>
              </div>

              {calculatedPrice ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="size-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Итоги подписки</p>
                  </div>
                  <div className="rounded-card border border-border bg-background/50 p-card-compact md:p-card-compact-md">
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        Старт:{" "}
                        <span className="font-medium text-foreground">{formatDate(previewStartBaseDate)}</span>
                      </p>
                      <p>
                        Окончание:{" "}
                        <span className="font-medium text-foreground">{formatDate(previewEndsAt)}</span>
                      </p>
                      <p>
                        Экономия:{" "}
                        <span className="font-medium text-foreground">{Math.max(0, totalSavings)} ₽</span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {!canExtendSubscription ? (
              <p className="text-sm text-muted-foreground">
                Продление станет доступно после подтверждения текущей оплаты администратором.
              </p>
            ) : null}

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  className="h-button w-full px-button-x"
                  disabled={checkoutDisabled}
                  radius="card"
                  type="button"
                >
                  {calculatedPrice ? (
                    hasReferralDiscount ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-muted-foreground line-through">
                          {totalAfterDurationDiscountDisplay} ₽
                        </span>
                        <span>{totalAfterReferralDiscountDisplay} ₽</span>
                      </span>
                    ) : (
                      `${calculatedPrice.finalTotalRub} ₽`
                    )
                  ) : (
                    "Итоговая цена"
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Оплата подписки</DialogTitle>
                  <DialogDescription>
                    К оплате {calculatedPrice?.finalTotalRub ?? 0} ₽ за{" "}
                    {getMonthsLabel(effectiveSelectedMonths)} и {effectiveSelectedDevices} устройств.
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
                      <p className="text-sm text-muted-foreground">{PAYMENT_DETAILS.cardNumber}</p>
                      <p className="text-sm text-muted-foreground">{PAYMENT_DETAILS.cardOwner}</p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  После перевода нажмите «Оплачено». Подписка активируется сразу, админ подтверждает
                  платеж позже.
                </p>
                <p className="text-sm text-muted-foreground">Баланс: {credits} кредитов.</p>

                <div className="space-y-2">
                  <form action={confirmTariffPaymentAction}>
                    <input name="devices" type="hidden" value={effectiveSelectedDevices} />
                    <input name="months" type="hidden" value={effectiveSelectedMonths} />
                    <Button className="h-button w-full px-button-x" radius="card" type="submit">
                      Оплачено
                    </Button>
                  </form>

                  <form action={payTariffWithCreditsAction}>
                    <input name="devices" type="hidden" value={effectiveSelectedDevices} />
                    <input name="months" type="hidden" value={effectiveSelectedMonths} />
                    <Button
                      className="h-button w-full px-button-x"
                      disabled={!hasEnoughCredits}
                      radius="card"
                      type="submit"
                      variant="outline"
                    >
                      Оплатить кредитами
                    </Button>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </AppSurface>
    </AppSectionShell>
  );
}

