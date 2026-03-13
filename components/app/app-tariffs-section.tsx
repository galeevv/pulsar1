"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CalendarClock, CreditCard, Loader2, Settings2, Smartphone, Wallet } from "lucide-react";
import { toast } from "sonner";

import { payTariffWithCreditsAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { calculateAppSubscriptionPreviewPrice } from "@/lib/subscription-preview";

import { AppSectionShell } from "./app-section-shell";
import { AppSetupDialog } from "./app-setup-dialog";
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
  autoOpenSetupDialog,
  canExtendSubscription,
  credits,
  currentActiveSubscriptionsCount,
  durationRules,
  firstPurchaseDiscountPct,
  isCapacityBlockedForNewSubscriptions,
  maxActiveSubscriptions,
  plategaPaymentRequestId,
  pricingSettings,
  setupSubscriptionUrl,
}: {
  activeSubscriptionEndAtIso: string | null;
  activeSubscriptionStartAtIso: string | null;
  autoOpenSetupDialog: boolean;
  canExtendSubscription: boolean;
  credits: number;
  currentActiveSubscriptionsCount: number;
  durationRules: DurationRuleItem[];
  firstPurchaseDiscountPct: number;
  isCapacityBlockedForNewSubscriptions: boolean;
  maxActiveSubscriptions: number;
  plategaPaymentRequestId: string | null;
  pricingSettings: PricingSettings;
  setupSubscriptionUrl: string | null;
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"PLATEGA" | "CREDITS">(
    "PLATEGA"
  );
  const [isCreatingPlategaPayment, setIsCreatingPlategaPayment] = useState(false);
  const [isCheckingPlategaPayment, setIsCheckingPlategaPayment] = useState(
    Boolean(plategaPaymentRequestId)
  );
  const [isSubmittingCredits, setIsSubmittingCredits] = useState(false);
  const creditsFormRef = useRef<HTMLFormElement | null>(null);

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
    !canExtendSubscription ||
    isCapacityBlockedForNewSubscriptions ||
    !isDeviceRangeValid ||
    !selectedRule ||
    !calculatedPrice;
  const paymentActionDisabled =
    checkoutDisabled || isCreatingPlategaPayment || isCheckingPlategaPayment || isSubmittingCredits;
  const hasEnoughCredits = calculatedPrice ? credits >= calculatedPrice.finalTotalRub : false;
  const hasReferralDiscount =
    firstPurchaseDiscountPct > 0 &&
    totalAfterReferralDiscountDisplay < totalAfterDurationDiscountDisplay;
  const totalSavings = calculatedPrice
    ? calculatedPrice.totalBeforeDiscountRub - calculatedPrice.finalTotalRub
    : 0;

  useEffect(() => {
    if (!plategaPaymentRequestId) {
      setIsCheckingPlategaPayment(false);
      return;
    }

    setIsCheckingPlategaPayment(true);
    let isCancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pollStatus = async () => {
      try {
        const response = await fetch(
          `/api/payments/platega/status?paymentRequestId=${encodeURIComponent(plategaPaymentRequestId)}`,
          { cache: "no-store" }
        );
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          isFinal?: boolean;
          status?: "APPROVED" | "CREATED" | "REJECTED";
        };

        if (!response.ok) {
          if (!isCancelled) {
            setIsCheckingPlategaPayment(false);
            const errorMessage = payload.error ?? "Не удалось проверить статус платежа.";
            window.location.replace(`/app?error=${encodeURIComponent(errorMessage)}#tariffs`);
          }
          return;
        }

        if (payload.status === "APPROVED") {
          if (!isCancelled) {
            setIsCheckingPlategaPayment(false);
            window.location.replace(
              `/app?notice=${encodeURIComponent(
                "Оплата через Platega подтверждена. Подписка активирована."
              )}&openSetup=1#dashboard`
            );
          }
          return;
        }

        if (payload.status === "REJECTED") {
          if (!isCancelled) {
            setIsCheckingPlategaPayment(false);
            window.location.replace(
              `/app?error=${encodeURIComponent(
                "Платеж через Platega не подтвержден. Попробуйте снова."
              )}#tariffs`
            );
          }
          return;
        }

        if (!isCancelled) {
          timer = setTimeout(pollStatus, 2500);
        }
      } catch {
        if (!isCancelled) {
          setIsCheckingPlategaPayment(false);
          window.location.replace(
            `/app?error=${encodeURIComponent(
              "Не удалось проверить статус платежа через Platega."
            )}#tariffs`
          );
        }
      }
    };

    void pollStatus();

    return () => {
      isCancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [plategaPaymentRequestId]);

  useEffect(() => {
    if (selectedPaymentMethod !== "CREDITS" && isSubmittingCredits) {
      setIsSubmittingCredits(false);
    }
  }, [isSubmittingCredits, selectedPaymentMethod]);

  async function startPlategaPayment() {
    if (!calculatedPrice || checkoutDisabled) {
      return;
    }

    setIsCreatingPlategaPayment(true);

    try {
      const response = await fetch("/api/payments/platega/create", {
        body: JSON.stringify({
          amount: calculatedPrice.finalTotalRub,
          description: `PulsarVPN ${effectiveSelectedMonths} мес. / ${effectiveSelectedDevices} устройств`,
          devices: effectiveSelectedDevices,
          months: effectiveSelectedMonths,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        paymentRequestId?: string;
        redirectUrl?: string;
      };

      if (!response.ok || !payload.redirectUrl) {
        throw new Error(payload.error || "Не удалось создать платеж в Platega.");
      }

      window.location.href = payload.redirectUrl;
    } catch (error) {
      setIsCreatingPlategaPayment(false);
      toast.error(error instanceof Error ? error.message : "Не удалось создать платеж в Platega.", {
        position: "bottom-right",
      });
    }
  }

  return (
    <AppSectionShell
      description="Настройте тариф: срок и устройства."
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
            {isCheckingPlategaPayment ? (
              <div className="rounded-card border border-border bg-background/50 p-card-compact text-sm text-muted-foreground md:p-card-compact-md">
                <p className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Платеж через банковскую карту обрабатывается. Обновляем статус подписки...
                </p>
              </div>
            ) : null}

            {isSubmittingCredits ? (
              <div className="rounded-card border border-border bg-background/50 p-card-compact text-sm text-muted-foreground md:p-card-compact-md">
                <p className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Оплата получена. Выдаем подписку и синхронизируем доступ...
                </p>
              </div>
            ) : null}

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

            {isCapacityBlockedForNewSubscriptions ? (
              <p className="text-sm text-muted-foreground">
                Свободных мест сейчас нет.
                {maxActiveSubscriptions > 0
                  ? ` Активных подписок: ${currentActiveSubscriptionsCount} из ${maxActiveSubscriptions}.`
                  : ""}
              </p>
            ) : null}

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  className="h-button w-full px-button-x"
                  disabled={paymentActionDisabled}
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
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      Срок:{" "}
                      <span className="font-medium text-foreground">
                        {getMonthsLabel(effectiveSelectedMonths)}
                      </span>
                    </p>
                    <p>
                      Устройства:{" "}
                      <span className="font-medium text-foreground">{effectiveSelectedDevices}</span>
                    </p>
                    <p>
                      К оплате:{" "}
                      <span className="font-medium text-foreground">
                        {calculatedPrice?.finalTotalRub ?? 0} ₽
                      </span>
                    </p>
                  </div>
                </div>

                <RadioGroup
                  className="space-y-1"
                  onValueChange={(value) => setSelectedPaymentMethod(value as "PLATEGA" | "CREDITS")}
                  value={selectedPaymentMethod}
                >
                  <label className="block cursor-pointer" htmlFor="payment-method-platega">
                    <Card
                      className={`transition-colors ${
                        selectedPaymentMethod === "PLATEGA"
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background/40 hover:bg-background/60"
                      }`}
                    >
                      <div className="flex w-full items-start justify-between gap-3 p-3">
                        <div className="min-w-0 flex-1 space-y-1 leading-snug">
                          <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                            <CreditCard className="size-4" />
                            Банковская карта
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Visa, MasterCard, Мир
                          </p>
                        </div>
                        <RadioGroupItem className="mt-0.5 shrink-0" id="payment-method-platega" value="PLATEGA" />
                      </div>
                    </Card>
                  </label>

                  <label className="block cursor-pointer" htmlFor="payment-method-credits">
                    <Card
                      className={`transition-colors ${
                        selectedPaymentMethod === "CREDITS"
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background/40 hover:bg-background/60"
                      }`}
                    >
                      <div className="flex w-full items-start justify-between gap-3 p-3">
                        <div className="min-w-0 flex-1 space-y-1 leading-snug">
                          <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Wallet className="size-4" />
                            Кредитами
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Баланс: {credits} кредитов
                          </p>
                        </div>
                        <RadioGroupItem className="mt-0.5 shrink-0" id="payment-method-credits" value="CREDITS" />
                      </div>
                    </Card>
                  </label>
                </RadioGroup>

                <form action={payTariffWithCreditsAction} ref={creditsFormRef}>
                  <input name="devices" type="hidden" value={effectiveSelectedDevices} />
                  <input name="months" type="hidden" value={effectiveSelectedMonths} />
                </form>

                <Button
                  className="h-button w-full px-button-x"
                  disabled={
                    selectedPaymentMethod === "CREDITS"
                      ? paymentActionDisabled || !hasEnoughCredits
                      : paymentActionDisabled
                  }
                  onClick={() => {
                    if (selectedPaymentMethod === "CREDITS") {
                      setIsSubmittingCredits(true);
                      creditsFormRef.current?.requestSubmit();
                      return;
                    }

                    void startPlategaPayment();
                  }}
                  radius="card"
                  type="button"
                >
                  {selectedPaymentMethod === "PLATEGA" ? (
                    isCreatingPlategaPayment ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Создаем платеж...
                      </span>
                    ) : (
                      "Оплатить банковской картой"
                    )
                  ) : (
                    isSubmittingCredits ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Выдаем подписку...
                      </span>
                    ) : (
                      "Оплатить кредитами"
                    )
                  )}
                </Button>

                {selectedPaymentMethod === "CREDITS" && !hasEnoughCredits ? (
                  <p className="text-sm text-muted-foreground">
                    Недостаточно кредитов. Пополните баланс или выберите банковскую карту.
                  </p>
                ) : null}
              </DialogContent>
            </Dialog>
          </div>
        )}
      </AppSurface>
      {setupSubscriptionUrl ? (
        <AppSetupDialog
          defaultOpen={autoOpenSetupDialog}
          showTrigger={false}
          subscriptionUrl={setupSubscriptionUrl}
        />
      ) : null}
    </AppSectionShell>
  );
}
