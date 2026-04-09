"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import {
  CreditCardIcon,
  Loader2Icon,
  SmartphoneIcon,
  TriangleAlertIcon,
  WalletIcon,
} from "lucide-react"
import { toast } from "sonner"

import { payTariffWithCreditsAction } from "@/app/app/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { calculateAppSubscriptionPreviewPrice } from "@/lib/subscription-preview"

type DurationRuleItem = {
  discountPercent: number
  id: string
  monthlyPrice: number
  months: number
}

type PricingSettings = {
  baseDeviceMonthlyPrice: number
  extraDeviceMonthlyPrice: number
  maxDevices: number
  minDevices: number
}

type CheckoutStep = "config" | "payment"

function getMonthsLabel(months: number) {
  if (months === 1) {
    return "1 месяц"
  }

  if (months >= 2 && months <= 4) {
    return `${months} месяца`
  }

  return `${months} месяцев`
}

function getPerMonthPrice(totalRub: number, months: number) {
  return Math.round(totalRub / Math.max(1, months))
}

export function QuickActionsSheet({
  canExtendSubscription,
  credits,
  currentActiveSubscriptionsCount,
  durationRules,
  firstPurchaseDiscountPct,
  isCapacityBlockedForNewSubscriptions,
  maxActiveSubscriptions,
  plategaPaymentRequestId,
  pricingSettings,
  triggerLabel,
  fullWidthTrigger = true,
}: {
  canExtendSubscription: boolean
  credits: number
  currentActiveSubscriptionsCount: number
  durationRules: DurationRuleItem[]
  firstPurchaseDiscountPct: number
  isCapacityBlockedForNewSubscriptions: boolean
  maxActiveSubscriptions: number
  plategaPaymentRequestId: string | null
  pricingSettings: PricingSettings
  triggerLabel: string
  fullWidthTrigger?: boolean
}) {
  const sortedRules = useMemo(
    () => [...durationRules].sort((a, b) => a.months - b.months),
    [durationRules]
  )

  const minimumDevices = pricingSettings.minDevices
  const maximumDevices = pricingSettings.maxDevices
  const isDeviceRangeValid = minimumDevices <= maximumDevices
  const defaultDevices = Math.min(Math.max(3, minimumDevices), maximumDevices)

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<CheckoutStep>("config")
  const [selectedMonths, setSelectedMonths] = useState(sortedRules[0]?.months ?? 1)
  const [selectedDevices, setSelectedDevices] = useState(defaultDevices)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "CREDITS" | "PLATEGA_CARD" | "PLATEGA_SBP"
  >("PLATEGA_SBP")
  const [isCreatingPlategaPayment, setIsCreatingPlategaPayment] = useState(false)
  const [isCheckingPlategaPayment, setIsCheckingPlategaPayment] = useState(
    Boolean(plategaPaymentRequestId)
  )
  const [isSubmittingCredits, setIsSubmittingCredits] = useState(false)
  const creditsFormRef = useRef<HTMLFormElement | null>(null)

  const selectedRule = sortedRules.find((item) => item.months === selectedMonths) ?? sortedRules[0]
  const effectiveSelectedMonths = selectedRule?.months ?? sortedRules[0]?.months ?? 1
  const effectiveSelectedDevices = Math.min(
    Math.max(selectedDevices, minimumDevices),
    maximumDevices
  )

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
    : null

  const totalAfterDurationDiscountDisplay = calculatedPrice?.totalAfterDurationDiscountRub ?? 0
  const totalAfterReferralDiscountDisplay = calculatedPrice?.finalTotalRub ?? 0

  const checkoutDisabled =
    !canExtendSubscription ||
    isCapacityBlockedForNewSubscriptions ||
    !isDeviceRangeValid ||
    !selectedRule ||
    !calculatedPrice

  const paymentActionDisabled =
    checkoutDisabled || isCreatingPlategaPayment || isCheckingPlategaPayment || isSubmittingCredits

  const hasEnoughCredits = calculatedPrice ? credits >= calculatedPrice.finalTotalRub : false
  const hasReferralDiscount =
    firstPurchaseDiscountPct > 0 &&
    totalAfterReferralDiscountDisplay < totalAfterDurationDiscountDisplay

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (nextOpen) {
      setStep("config")
      setSelectedMonths(sortedRules[0]?.months ?? 1)
      setSelectedDevices(defaultDevices)
      setSelectedPaymentMethod("PLATEGA_SBP")
      setIsSubmittingCredits(false)
      setIsCreatingPlategaPayment(false)
    }
  }

  useEffect(() => {
    if (!plategaPaymentRequestId) {
      setIsCheckingPlategaPayment(false)
      return
    }

    setIsCheckingPlategaPayment(true)
    let isCancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const pollStatus = async () => {
      try {
        const response = await fetch(
          `/api/payments/platega/status?paymentRequestId=${encodeURIComponent(plategaPaymentRequestId)}`,
          { cache: "no-store" }
        )
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string
          status?: "APPROVED" | "CREATED" | "REJECTED"
        }

        if (!response.ok) {
          if (!isCancelled) {
            setIsCheckingPlategaPayment(false)
            const errorMessage = payload.error ?? "Не удалось проверить статус платежа."
            window.location.replace(`/app?tab=home&error=${encodeURIComponent(errorMessage)}`)
          }
          return
        }

        if (payload.status === "APPROVED") {
          if (!isCancelled) {
            setIsCheckingPlategaPayment(false)
            window.location.replace(
              `/app?tab=home&notice=${encodeURIComponent(
                "Оплата через Platega подтверждена. Подписка активирована."
              )}&openSetup=1`
            )
          }
          return
        }

        if (payload.status === "REJECTED") {
          if (!isCancelled) {
            setIsCheckingPlategaPayment(false)
            window.location.replace(
              `/app?tab=home&error=${encodeURIComponent(
                "Платеж через Platega не подтвержден. Попробуйте снова."
              )}`
            )
          }
          return
        }

        if (!isCancelled) {
          timer = setTimeout(pollStatus, 2500)
        }
      } catch {
        if (!isCancelled) {
          setIsCheckingPlategaPayment(false)
          window.location.replace(
            `/app?tab=home&error=${encodeURIComponent(
              "Не удалось проверить статус платежа через Platega."
            )}`
          )
        }
      }
    }

    void pollStatus()

    return () => {
      isCancelled = true
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [plategaPaymentRequestId])

  useEffect(() => {
    if (selectedPaymentMethod !== "CREDITS" && isSubmittingCredits) {
      setIsSubmittingCredits(false)
    }
  }, [isSubmittingCredits, selectedPaymentMethod])

  async function startPlategaPayment(channel: "CARD" | "SBP") {
    if (!calculatedPrice || checkoutDisabled) {
      return
    }

    setIsCreatingPlategaPayment(true)

    try {
      const response = await fetch("/api/payments/platega/create", {
        body: JSON.stringify({
          amount: calculatedPrice.finalTotalRub,
          description: `PulsarVPN ${effectiveSelectedMonths} мес. / ${effectiveSelectedDevices} устройств`,
          devices: effectiveSelectedDevices,
          months: effectiveSelectedMonths,
          plategaPaymentMethod: channel,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        redirectUrl?: string
      }

      if (!response.ok || !payload.redirectUrl) {
        throw new Error(payload.error || "Не удалось создать платеж в Platega.")
      }

      window.location.href = payload.redirectUrl
    } catch (error) {
      setIsCreatingPlategaPayment(false)
      toast.error(error instanceof Error ? error.message : "Не удалось создать платеж в Platega.")
    }
  }

  return (
    <Drawer onOpenChange={handleOpenChange} open={open}>
      <DrawerTrigger asChild>
        <Button
          className={fullWidthTrigger ? "h-button w-full px-button-x" : "h-button px-button-x"}
          radius="card"
        >
          <CreditCardIcon className="size-4" />
          {triggerLabel}
        </Button>
      </DrawerTrigger>

      <DrawerContent className="before:shadow-none">
        <DrawerHeader className="sr-only">
          <DrawerTitle>{triggerLabel}</DrawerTitle>
          <DrawerDescription>Настройте параметры и выберите способ оплаты.</DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          <div className="space-y-4 pb-6 pt-6">
            {isCheckingPlategaPayment ? (
              <Alert>
                <Loader2Icon className="animate-spin" />
                <AlertTitle>Проверяем статус платежа</AlertTitle>
                <AlertDescription>
                  Платеж через Platega обрабатывается. Подождите несколько секунд.
                </AlertDescription>
              </Alert>
            ) : null}

            {!canExtendSubscription ? (
              <Alert>
                <AlertTitle>Продление временно недоступно</AlertTitle>
                <AlertDescription>
                  Дождитесь завершения текущего платежа и повторите попытку.
                </AlertDescription>
              </Alert>
            ) : null}

            {isCapacityBlockedForNewSubscriptions ? (
              <Alert>
                <AlertTitle>Свободных мест нет</AlertTitle>
                <AlertDescription>
                  Активных подписок: {currentActiveSubscriptionsCount}
                  {maxActiveSubscriptions > 0 ? ` из ${maxActiveSubscriptions}` : ""}.
                </AlertDescription>
              </Alert>
            ) : null}

            {step === "config" ? (
              <>
                <div className="flex flex-col gap-2">
                  {sortedRules.map((rule) => {
                    const isActive = selectedMonths === rule.months
                    const itemPrice = calculateAppSubscriptionPreviewPrice({
                      devices: effectiveSelectedDevices,
                      firstPurchaseDiscountPct,
                      pricingSettings: {
                        baseDeviceMonthlyPrice: pricingSettings.baseDeviceMonthlyPrice,
                        extraDeviceMonthlyPrice: pricingSettings.extraDeviceMonthlyPrice,
                      },
                      rule,
                    })
                    const hasRuleReferralDiscount =
                      itemPrice.finalTotalRub < itemPrice.totalAfterDurationDiscountRub

                    return (
                      <Button
                        className="h-auto w-full px-3 py-3"
                        data-active={isActive}
                        key={rule.id}
                        onClick={() => setSelectedMonths(rule.months)}
                        radius="card"
                        type="button"
                        variant={isActive ? "secondary" : "outline"}
                      >
                        <span className="grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-left">
                          <span className="text-sm font-medium">{getMonthsLabel(rule.months)}</span>
                          <span className="text-right text-sm font-semibold">
                            {itemPrice.finalTotalRub} ₽
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getPerMonthPrice(itemPrice.finalTotalRub, rule.months)} ₽/мес
                          </span>
                          <span className="flex items-center justify-end gap-1.5 text-xs">
                            <span className="text-muted-foreground">-{rule.discountPercent}%</span>
                            {hasRuleReferralDiscount ? (
                              <Badge variant="success">Реф. скидка</Badge>
                            ) : null}
                          </span>
                        </span>
                      </Button>
                    )
                  })}
                </div>

                <div className="space-y-3 rounded-card border border-border/70 bg-card/30 p-3">
                  <p className="inline-flex items-center gap-2 text-sm font-medium">
                    <SmartphoneIcon className="size-4 text-muted-foreground" />
                    Устройства: {effectiveSelectedDevices}
                  </p>
                  <Slider
                    max={maximumDevices}
                    min={minimumDevices}
                    onValueChange={(value) => {
                      const next = Number(value[0] ?? minimumDevices)
                      setSelectedDevices(Math.min(Math.max(next, minimumDevices), maximumDevices))
                    }}
                    step={1}
                    value={[effectiveSelectedDevices]}
                  />
                </div>
              </>
            ) : (
              <>
                <Card className="gap-1 rounded-card border border-border/70 bg-card/30 p-3 shadow-none ring-0">
                  <p className="text-sm text-muted-foreground">
                    Период: <span className="text-foreground">{getMonthsLabel(effectiveSelectedMonths)}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Устройства: <span className="text-foreground">{effectiveSelectedDevices}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    К оплате: <span className="text-foreground">{calculatedPrice?.finalTotalRub ?? 0} ₽ </span>
                  </p>
                </Card>

                <RadioGroup
                  className="space-y-0 px-px"
                  onValueChange={(value) =>
                    setSelectedPaymentMethod(value as "CREDITS" | "PLATEGA_CARD" | "PLATEGA_SBP")
                  }
                  value={selectedPaymentMethod}
                >
                  <label className="block cursor-pointer" htmlFor="method-sbp">
                    <Card className="rounded-card border border-border/70 bg-card/30 p-3 shadow-none ring-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="inline-flex items-center gap-2 text-sm font-medium">
                            <SmartphoneIcon className="size-4" />
                            СБП
                          </p>
                          <p className="text-xs text-muted-foreground">Система быстрых платежей</p>
                        </div>
                        <RadioGroupItem id="method-sbp" value="PLATEGA_SBP" />
                      </div>
                    </Card>
                  </label>

                  <label className="block cursor-pointer" htmlFor="method-card">
                    <Card className="rounded-card border border-border/70 bg-card/30 p-3 shadow-none ring-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="inline-flex items-center gap-2 text-sm font-medium">
                            <CreditCardIcon className="size-4" />
                            Банковская карта
                          </p>
                          <p className="text-xs text-muted-foreground">Visa, MasterCard, Мир</p>
                        </div>
                        <RadioGroupItem id="method-card" value="PLATEGA_CARD" />
                      </div>
                    </Card>
                  </label>

                  <label className="block cursor-pointer" htmlFor="method-credits">
                    <Card className="rounded-card border border-border/70 bg-card/30 p-3 shadow-none ring-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="inline-flex items-center gap-2 text-sm font-medium">
                            <WalletIcon className="size-4" />
                            Кредитами
                          </p>
                          <p className="text-xs text-muted-foreground">Баланс: {credits} credits</p>
                        </div>
                        <RadioGroupItem id="method-credits" value="CREDITS" />
                      </div>
                    </Card>
                  </label>
                </RadioGroup>
              </>
            )}
          </div>
        </div>

        <form action={payTariffWithCreditsAction} ref={creditsFormRef}>
          <input name="devices" type="hidden" value={effectiveSelectedDevices} />
          <input name="months" type="hidden" value={effectiveSelectedMonths} />
        </form>

        <DrawerFooter className="pt-2">
          {step === "config" ? (
            <Button
              className="h-button w-full px-button-x"
              disabled={checkoutDisabled || isCheckingPlategaPayment}
              onClick={() => setStep("payment")}
              radius="card"
              type="button"
            >
              Далее
            </Button>
          ) : (
            <>
              {selectedPaymentMethod === "CREDITS" && !hasEnoughCredits ? (
                <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-100">
                  <TriangleAlertIcon className="text-amber-300" />
                  <AlertTitle>Недостаточно кредитов</AlertTitle>
                  <AlertDescription className="text-amber-200/90">
                    Выберите СБП или банковскую карту для оплаты.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex w-full gap-2">
                <Button
                  className="h-button px-button-x"
                  onClick={() => setStep("config")}
                  radius="card"
                  type="button"
                  variant="outline"
                >
                  Назад
                </Button>

                <Button
                  className="h-button min-w-0 flex-1 px-button-x"
                  disabled={
                    selectedPaymentMethod === "CREDITS"
                      ? paymentActionDisabled || !hasEnoughCredits
                      : paymentActionDisabled
                  }
                  onClick={() => {
                    if (selectedPaymentMethod === "CREDITS") {
                      setIsSubmittingCredits(true)
                      creditsFormRef.current?.requestSubmit()
                      return
                    }

                    void startPlategaPayment(selectedPaymentMethod === "PLATEGA_CARD" ? "CARD" : "SBP")
                  }}
                  radius="card"
                  type="button"
                >
                  {selectedPaymentMethod !== "CREDITS" ? (
                    isCreatingPlategaPayment ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        Создаем платеж...
                      </>
                    ) : hasReferralDiscount ? (
                      <>
                        <span className="text-muted-foreground line-through">
                          {totalAfterDurationDiscountDisplay} ₽
                        </span>
                        {totalAfterReferralDiscountDisplay} ₽
                      </>
                    ) : (
                      `${calculatedPrice?.finalTotalRub ?? 0} ₽`
                    )
                  ) : isSubmittingCredits ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Выдаем подписку...
                    </>
                  ) : (
                    "Оплатить кредитами"
                  )}
                </Button>
              </div>
            </>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
