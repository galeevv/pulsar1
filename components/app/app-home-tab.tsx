import { AlertCircleIcon } from "lucide-react"

import { ActionRow } from "@/components/app/action-row"
import { AppSetupDialog } from "@/components/app/app-setup-dialog"
import { QuickActionsSheet } from "@/components/app/quick-actions-sheet"
import { StatusHeroCard } from "@/components/app/status-hero-card"
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
  endsAt: Date
  expiresAt: Date | null
  paymentRequest: {
    status: "APPROVED" | "CREATED" | "REJECTED"
  } | null
  startsAt: Date | null
  startedAt: Date
  status: "ACTIVE" | "EXPIRED" | "REVOKED"
  subscriptionUrl: string | null
  tariffName: string
} | null

type LatestSubscriptionStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | null

function getSubscriptionState(
  activeSubscription: ActiveSubscriptionItem,
  latestStatus: LatestSubscriptionStatus
) {
  if (activeSubscription) {
    const endAt = activeSubscription.expiresAt ?? activeSubscription.endsAt
    return {
      ctaLabel: "Продлить подписку",
      label: `До ${endAt.toLocaleDateString("ru-RU")}`,
      variant: "success" as const,
    }
  }

  if (latestStatus === "EXPIRED") {
    return {
      ctaLabel: "Продлить подписку",
      label: "Истекла",
      variant: "warning" as const,
    }
  }

  if (latestStatus === "REVOKED") {
    return {
      ctaLabel: "Купить подписку",
      label: "Отозвана",
      variant: "warning" as const,
    }
  }

  return {
    ctaLabel: "Купить подписку",
    label: "Не активна",
    variant: "default" as const,
  }
}

export function AppHomeTab({
  activeSubscription,
  autoOpenSetupDialog,
  canExtendSubscription,
  credits,
  currentActiveSubscriptionsCount,
  durationRules,
  firstPurchaseDiscountPct,
  isCapacityBlockedForNewSubscriptions,
  latestSubscriptionStatus,
  maxActiveSubscriptions,
  plategaPaymentRequestId,
  pricingSettings,
}: {
  activeSubscription: ActiveSubscriptionItem
  autoOpenSetupDialog: boolean
  canExtendSubscription: boolean
  credits: number
  currentActiveSubscriptionsCount: number
  durationRules: DurationRuleItem[]
  firstPurchaseDiscountPct: number
  isCapacityBlockedForNewSubscriptions: boolean
  latestSubscriptionStatus: LatestSubscriptionStatus
  maxActiveSubscriptions: number
  plategaPaymentRequestId: string | null
  pricingSettings: PricingSettings
}) {
  const state = getSubscriptionState(activeSubscription, latestSubscriptionStatus)

  return (
    <section className="space-y-4">
      {isCapacityBlockedForNewSubscriptions && !activeSubscription ? (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>Покупка временно недоступна</AlertTitle>
          <AlertDescription>Достигнут лимит активных подписок.</AlertDescription>
        </Alert>
      ) : null}

      <StatusHeroCard balanceCredits={credits} statusLabel={state.label} statusVariant={state.variant}>
        <ActionRow>
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
            triggerLabel={state.ctaLabel}
          />
          <AppSetupDialog
            defaultOpen={autoOpenSetupDialog}
            subscriptionUrl={activeSubscription?.subscriptionUrl ?? null}
            triggerLabel="Настроить VPN"
            triggerVariant="outline"
          />
        </ActionRow>
      </StatusHeroCard>
    </section>
  )
}
