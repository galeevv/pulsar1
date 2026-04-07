import { TriangleAlertIcon } from "lucide-react"

import { DeviceList } from "@/components/app/device-list"
import { EmptyStateBlock } from "@/components/app/empty-state-block"
import { QuickActionsSheet } from "@/components/app/quick-actions-sheet"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
    id: string
    label: string | null
    lastSyncError: string | null
    slotIndex: number
    status: "ACTIVE" | "BLOCKED" | "FREE"
  }>
  devices: number
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

  const deviceLimit = Math.max(activeSubscription.devices, activeSubscription.deviceLimit)
  const activeDevices = activeSubscription.deviceSlots.filter((slot) => slot.status === "ACTIVE").length
  const isDeviceLimitReached = deviceLimit > 0 && activeDevices >= deviceLimit

  return (
    <section className="space-y-4">
      {isDeviceLimitReached ? (
        <Alert>
          <TriangleAlertIcon />
          <AlertTitle>Лимит устройств достигнут</AlertTitle>
          <AlertDescription>
            Активно {activeDevices} из {deviceLimit}. Отключите один из слотов, чтобы подключить новое устройство.
          </AlertDescription>
        </Alert>
      ) : null}

      {activeSubscription.deviceSlots.length ? (
        <DeviceList slots={activeSubscription.deviceSlots} />
      ) : (
        <EmptyStateBlock
          description="Слоты пока не созданы. Повторите позже или обратитесь в поддержку."
          title="Нет устройств"
        />
      )}
    </section>
  )
}
