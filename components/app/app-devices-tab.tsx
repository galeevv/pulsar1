import Image from "next/image"
import { GaugeIcon } from "lucide-react"

import { DeviceLimitChangeDialog } from "@/components/app/device-limit-change-dialog"
import { DeviceList } from "@/components/app/device-list"
import { EmptyStateBlock } from "@/components/app/empty-state-block"
import { QuickActionsSheet } from "@/components/app/quick-actions-sheet"
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

  return (
    <section className="space-y-4">
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
            <DeviceList
              slots={activeSubscription.deviceSlots.slice(0, activeSubscription.deviceLimit)}
              subscriptionUrl={activeSubscription.subscriptionUrl}
            />
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

          <DeviceLimitChangeDialog
            credits={credits}
            currentDevices={activeSubscription.deviceLimit}
            expiresAt={(activeSubscription.expiresAt ?? activeSubscription.endsAt).toISOString()}
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
