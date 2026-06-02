import { AlertCircleIcon, RefreshCwIcon } from "lucide-react"

import { syncOwnSubscriptionAction } from "@/app/app/actions"
import { ActionRow } from "@/components/app/action-row"
import { AppSetupDialog } from "@/components/app/app-setup-dialog"
import { FormSubmitButton } from "@/components/app/form-submit-button"
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
    deviceOs: "ANDROID" | "IOS" | "MACOS" | "UNKNOWN" | "WINDOWS"
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
  migrationLinkRefreshRequired: boolean
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
    }
  }

  if (latestStatus === "EXPIRED") {
    return {
      ctaLabel: "Продлить подписку",
      label: "Истекла",
    }
  }

  if (latestStatus === "REVOKED") {
    return {
      ctaLabel: "Купить подписку",
      label: "Отозвана",
    }
  }

  return {
    ctaLabel: "Купить подписку",
    label: "Не активна",
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
  migrationBanner,
  maxActiveSubscriptions,
  plategaPaymentEnabled,
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
  migrationBanner: {
    enabled: boolean
    text: string
    title: string
  }
  maxActiveSubscriptions: number
  plategaPaymentEnabled: boolean
  plategaPaymentRequestId: string | null
  pricingSettings: PricingSettings
}) {
  const state = getSubscriptionState(activeSubscription, latestSubscriptionStatus)
  const setupPreviewSlot =
    activeSubscription?.deviceSlots.find(
      (slot) => slot.status === "FREE" && Boolean(slot.configUrl)
    ) ?? null

  return (
    <section className="space-y-4">
      {isCapacityBlockedForNewSubscriptions && !activeSubscription ? (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>Покупка временно недоступна</AlertTitle>
          <AlertDescription>Достигнут лимит активных подписок.</AlertDescription>
        </Alert>
      ) : null}

      {migrationBanner.enabled && activeSubscription?.migrationLinkRefreshRequired ? (
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

      <StatusHeroCard balanceCredits={credits} statusLabel={state.label}>
        <ActionRow>
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
            triggerLabel={state.ctaLabel}
          />
          <AppSetupDialog
            canStartSetup={Boolean(activeSubscription)}
            defaultOpen={autoOpenSetupDialog}
            previewSlot={
              setupPreviewSlot
                ? {
                    configUrl: setupPreviewSlot.configUrl!,
                    id: setupPreviewSlot.id,
                    slotIndex: setupPreviewSlot.slotIndex,
                  }
                : null
            }
            subscriptionUrl={activeSubscription?.subscriptionUrl ?? null}
            triggerLabel="Настроить VPN"
            triggerVariant="outline"
          />
        </ActionRow>
      </StatusHeroCard>
    </section>
  )
}
