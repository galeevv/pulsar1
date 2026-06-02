import Image from "next/image"
import { AlertCircleIcon, GaugeIcon, Link2Icon, RefreshCwIcon } from "lucide-react"

import { syncOwnSubscriptionAction } from "@/app/app/actions"
import { DeviceLimitChangeDialog } from "@/components/app/device-limit-change-dialog"
import { DeviceList } from "@/components/app/device-list"
import { EmptyStateBlock } from "@/components/app/empty-state-block"
import { FormSubmitButton } from "@/components/app/form-submit-button"
import { QuickActionsSheet } from "@/components/app/quick-actions-sheet"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"

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

type ActiveSubscriptionItem = {
  deviceLimit: number
  deviceSlots: Array<{
    configUrl: string | null
    deviceOs: "ANDROID" | "IOS" | "MACOS" | "UNKNOWN" | "WINDOWS"
    id: string
    lastSyncError: string | null
    slotIndex: number
    status: "ACTIVE" | "BLOCKED" | "FREE"
  }>
  devices: number
  endsAt: Date
  expiresAt: Date | null
  migrationLinkRefreshRequired: boolean
  subscriptionUrl: string | null
} | null

export function AppDevicesTab({
  activeSubscription,
  canExtendSubscription,
  credits,
  currentActiveSubscriptionsCount,
  durationRules,
  firstPurchaseDiscountPct,
  isCapacityBlockedForNewSubscriptions,
  maxActiveSubscriptions,
  migrationBanner,
  plategaPaymentEnabled,
  plategaPaymentRequestId,
  pricingSettings,
}: {
  activeSubscription: ActiveSubscriptionItem
  canExtendSubscription: boolean
  credits: number
  currentActiveSubscriptionsCount: number
  durationRules: DurationRuleItem[]
  firstPurchaseDiscountPct: number
  isCapacityBlockedForNewSubscriptions: boolean
  maxActiveSubscriptions: number
  migrationBanner: {
    enabled: boolean
    text: string
    title: string
  }
  plategaPaymentEnabled: boolean
  plategaPaymentRequestId: string | null
  pricingSettings: PricingSettings
}) {
  if (!activeSubscription) {
    return (
      <section className="space-y-4">
        <EmptyStateBlock
          action={
            <QuickActionsSheet
              canExtendSubscription={canExtendSubscription}
              credits={credits}
              currentActiveSubscriptionsCount={currentActiveSubscriptionsCount}
              durationRules={durationRules}
              firstPurchaseDiscountPct={firstPurchaseDiscountPct}
              isCapacityBlockedForNewSubscriptions={isCapacityBlockedForNewSubscriptions}
              maxActiveSubscriptions={maxActiveSubscriptions}
              plategaPaymentEnabled={plategaPaymentEnabled}
              plategaPaymentRequestId={plategaPaymentRequestId}
              pricingSettings={pricingSettings}
              fullWidthTrigger={false}
              triggerLabel="Купить подписку"
            />
          }
          description="Слоты появятся после активации подписки."
          title="Нет активной подписки"
        />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      {migrationBanner.enabled && activeSubscription.migrationLinkRefreshRequired ? (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>{migrationBanner.title}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>{migrationBanner.text}</p>
            <form action={syncOwnSubscriptionAction}>
              <FormSubmitButton className="h-button px-button-x" radius="card" type="submit">
                <RefreshCwIcon data-icon="inline-start" />
                Получить новую ссылку
              </FormSubmitButton>
            </form>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="gap-0 overflow-hidden border-border/70 bg-card/40 py-0">
        <div className="relative aspect-[16/9] w-full border-b border-border/70 bg-transparent">
          <Image
            alt="Устройства PulsarVPN"
            className="object-contain p-0"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 460px"
            src="/details/observed.gif"
            unoptimized
          />
        </div>
        <CardContent className="space-y-4 p-4">
          <CardTitle className="text-lg">Устройства</CardTitle>

          {activeSubscription.deviceSlots.length ? (
            <div className="flex flex-col gap-3">
              <DeviceList
                slots={activeSubscription.deviceSlots.slice(0, 1)}
                subscriptionUrl={activeSubscription.subscriptionUrl}
              />
              {activeSubscription.migrationLinkRefreshRequired ? (
                <form action={syncOwnSubscriptionAction}>
                  <FormSubmitButton
                    className="h-button w-full px-button-x"
                    pendingLabel="Синхронизируем..."
                    radius="card"
                    type="submit"
                    variant="outline"
                  >
                    <RefreshCwIcon data-icon="inline-start" />
                    Получить новую ссылку
                  </FormSubmitButton>
                </form>
              ) : null}
            </div>
          ) : (
            <EmptyStateBlock
              description="Слоты пока не созданы. Повторите позже или обратитесь в поддержку."
              title="Нет устройств"
            />
          )}

          <Card className="gap-0 border-border/70 bg-card/40 py-0">
            <CardContent className="flex items-center gap-3 p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-card border border-border bg-background/60">
                <GaugeIcon className="size-4 text-muted-foreground" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Лимит устройств</p>
                <p className="truncate text-xs text-muted-foreground">
                  До {activeSubscription.deviceLimit} одновременного подключения.
                </p>
              </div>
            </CardContent>
          </Card>

          {activeSubscription.subscriptionUrl ? (
            <Button asChild className="h-button w-full px-button-x" radius="card">
              <a href={`happ://add/${activeSubscription.subscriptionUrl}`}>
                <Link2Icon data-icon="inline-start" />
                Подключить в Happ
              </a>
            </Button>
          ) : null}

          <DeviceLimitChangeDialog
            credits={credits}
            currentDevices={activeSubscription.deviceLimit}
            expiresAt={(activeSubscription.expiresAt ?? activeSubscription.endsAt).toISOString()}
            plategaPaymentEnabled={plategaPaymentEnabled}
            pricingSettings={{
              extraDeviceMonthlyPrice: pricingSettings.extraDeviceMonthlyPrice,
              maxDevices: pricingSettings.maxDevices,
            }}
          />
        </CardContent>
      </Card>
    </section>
  )
}
