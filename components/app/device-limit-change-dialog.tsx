"use client"

import { useMemo, useState } from "react"

import {
  Loader2Icon,
  SlidersHorizontalIcon,
  SmartphoneIcon,
  WalletIcon,
} from "lucide-react"
import { toast } from "sonner"

import { changeDeviceLimitWithCreditsAction } from "@/app/app/actions"
import { FormSubmitButton } from "@/components/app/form-submit-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"

type PricingSettings = {
  extraDeviceMonthlyPrice: number
  maxDevices: number
}

type PaymentMethod = "CREDITS" | "PLATEGA_SBP"

function getRemainingDays(expiresAt: string) {
  const parsed = new Date(expiresAt)
  if (Number.isNaN(parsed.getTime())) {
    return 1
  }

  return Math.max(1, Math.ceil((parsed.getTime() - Date.now()) / 86_400_000))
}

export function DeviceLimitChangeDialog({
  credits,
  currentDevices,
  expiresAt,
  plategaPaymentEnabled,
  pricingSettings,
}: {
  credits: number
  currentDevices: number
  expiresAt: string
  plategaPaymentEnabled: boolean
  pricingSettings: PricingSettings
}) {
  const maxDevices = Math.max(currentDevices, pricingSettings.maxDevices)
  const [selectedDevices, setSelectedDevices] = useState(Math.min(currentDevices + 1, maxDevices))
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("CREDITS")
  const [isCreatingPayment, setIsCreatingPayment] = useState(false)
  const remainingDays = useMemo(() => getRemainingDays(expiresAt), [expiresAt])
  const extraDevices = Math.max(0, selectedDevices - currentDevices)
  const proratedAmount = Math.ceil(
    (extraDevices * pricingSettings.extraDeviceMonthlyPrice * remainingDays) / 30
  )
  const canIncrease = currentDevices < maxDevices
  const hasEnoughCredits = credits >= proratedAmount
  const isCreditsPayment = selectedPaymentMethod === "CREDITS"

  async function startSbpPayment() {
    if (!plategaPaymentEnabled || !canIncrease || proratedAmount <= 0 || isCreatingPayment) {
      return
    }

    setIsCreatingPayment(true)

    try {
      const response = await fetch("/api/payments/platega/create", {
        body: JSON.stringify({
          amount: proratedAmount,
          description: `PulsarVPN: лимит устройств ${currentDevices} -> ${selectedDevices}`,
          devices: selectedDevices,
          months: 0,
          plategaPaymentMethod: "SBP",
          purpose: "DEVICE_LIMIT_CHANGE",
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
        throw new Error(payload.error || "Не удалось создать платеж через СБП.")
      }

      window.location.href = payload.redirectUrl
    } catch (error) {
      setIsCreatingPayment(false)
      toast.error(error instanceof Error ? error.message : "Не удалось создать платеж через СБП.")
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-button w-full px-button-x" disabled={!canIncrease} radius="card" type="button">
          <SlidersHorizontalIcon className="size-4" />
          Изменить лимит
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Изменить лимит устройств</DialogTitle>
          <DialogDescription>
            Доплата считается только за оставшиеся дни текущей подписки.
          </DialogDescription>
        </DialogHeader>

        <form action={changeDeviceLimitWithCreditsAction} className="flex flex-col gap-4">
          <input name="nextDevices" type="hidden" value={selectedDevices} />

          <div className="rounded-card border border-border/70 bg-background/40 p-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Новый лимит</span>
              <span className="font-semibold">{selectedDevices}</span>
            </div>
            <Slider
              className="mt-4"
              disabled={!canIncrease || isCreatingPayment}
              max={maxDevices}
              min={currentDevices + 1}
              onValueChange={(value) => setSelectedDevices(value[0] ?? currentDevices + 1)}
              step={1}
              value={[selectedDevices]}
            />
          </div>

          <div className="grid gap-2 rounded-card border border-border/70 bg-background/40 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Осталось дней</span>
              <span>{remainingDays}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Доп. устройств</span>
              <span>{extraDevices}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">К оплате</span>
              <span className="font-semibold">{proratedAmount} ₽</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Баланс</span>
              <span>{credits} credits</span>
            </div>
          </div>

          <RadioGroup
            className="grid gap-2"
            onValueChange={(value) => setSelectedPaymentMethod(value as PaymentMethod)}
            value={selectedPaymentMethod}
          >
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-card border border-border/70 bg-background/40 p-3 text-sm">
              <span className="inline-flex min-w-0 items-center gap-2">
                <WalletIcon className="size-4 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block font-medium">Credits</span>
                  <span className="block text-xs text-muted-foreground">Списание с баланса</span>
                </span>
              </span>
              <RadioGroupItem value="CREDITS" />
            </label>

            {plategaPaymentEnabled ? (
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-card border border-border/70 bg-background/40 p-3 text-sm">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <SmartphoneIcon className="size-4 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block font-medium">СБП</span>
                    <span className="block text-xs text-muted-foreground">Оплата через Platega</span>
                  </span>
                </span>
                <RadioGroupItem value="PLATEGA_SBP" />
              </label>
            ) : null}
          </RadioGroup>

          {isCreditsPayment && !hasEnoughCredits ? (
            <Alert>
              <WalletIcon className="size-4" />
              <AlertTitle>Недостаточно credits</AlertTitle>
              <AlertDescription>
                {plategaPaymentEnabled
                  ? "Выберите СБП или пополните баланс."
                  : "Оплата Platega отключена, а кредитов не хватает."}
              </AlertDescription>
            </Alert>
          ) : null}

          {isCreditsPayment ? (
            <FormSubmitButton
              className="h-button w-full px-button-x"
              disabled={!canIncrease || !hasEnoughCredits || isCreatingPayment}
              pendingLabel="Обновляем..."
              radius="card"
              type="submit"
            >
              Оплатить credits и обновить лимит
            </FormSubmitButton>
          ) : (
            <Button
              className="h-button w-full px-button-x"
              disabled={!canIncrease || isCreatingPayment}
              onClick={startSbpPayment}
              radius="card"
              type="button"
            >
              {isCreatingPayment ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Создаем платеж...
                </>
              ) : (
                "Оплатить через СБП"
              )}
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
