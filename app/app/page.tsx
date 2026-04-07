import { redirect } from "next/navigation"

import { AppFeedbackToast } from "@/app/app/app-feedback-toast"
import { AppDevicesTab } from "@/components/app/app-devices-tab"
import { AppHomeTab } from "@/components/app/app-home-tab"
import { AppProfileTab } from "@/components/app/app-profile-tab"
import { AppReferralsTab } from "@/components/app/app-referrals-tab"
import { AppShell } from "@/components/app/app-shell"
import { AppUrlQueryCleanup } from "@/components/app/app-url-query-cleanup"
import { mapLegacyDialogToAppTab, normalizeAppTab } from "@/lib/app-tabs"
import { getAppBenefitsData } from "@/lib/app-benefits"
import { getCurrentSession } from "@/lib/auth"
import { getLegalDocuments } from "@/lib/legal-documents"
import { getServiceCapacityState } from "@/lib/service-capacity"
import { getAppSubscriptionConstructorData } from "@/lib/subscription-constructor"
import { getAppSubscriptionData } from "@/lib/subscription-management"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function getValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key]
  return Array.isArray(value) ? value[0] : value
}

function decodeSearchParam(value: string | undefined) {
  if (!value) {
    return undefined
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export default async function AppPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await getCurrentSession()

  if (!session) {
    redirect("/")
  }

  if (session.role !== "USER") {
    redirect("/admin")
  }

  const resolvedSearchParams = await searchParams
  const error = getValue(resolvedSearchParams, "error")
  const notice = getValue(resolvedSearchParams, "notice")
  const dialog = getValue(resolvedSearchParams, "dialog")
  const requestedTab = getValue(resolvedSearchParams, "tab")
  const shouldAutoOpenSetupDialog = getValue(resolvedSearchParams, "openSetup") === "1"
  const plategaPaymentRequestId = getValue(resolvedSearchParams, "plategaPaymentRequestId")

  const normalizedDialog = dialog === "promo" || dialog === "referral" ? dialog : null
  const activeTab = requestedTab
    ? normalizeAppTab(requestedTab)
    : mapLegacyDialogToAppTab(normalizedDialog) ?? "home"

  const [benefitsData, subscriptionData, constructorData, serviceCapacityState, legalDocuments] =
    await Promise.all([
      getAppBenefitsData(session.username),
      getAppSubscriptionData(session.username),
      getAppSubscriptionConstructorData(),
      getServiceCapacityState(),
      getLegalDocuments(),
    ])

  if (!benefitsData || !subscriptionData) {
    redirect("/")
  }

  const canExtendSubscription =
    !subscriptionData.activeSubscription ||
    subscriptionData.activeSubscription.paymentRequest?.status === "APPROVED"
  const isNewUserWithoutActiveSubscription = !subscriptionData.activeSubscription
  const isCapacityBlockedForNewSubscriptions =
    isNewUserWithoutActiveSubscription && serviceCapacityState.isLimitReached
  const latestSubscriptionStatus = subscriptionData.latestSubscriptions[0]?.status ?? null

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppFeedbackToast error={decodeSearchParam(error)} notice={decodeSearchParam(notice)} />
      <AppUrlQueryCleanup
        clearDialogQuery={Boolean(normalizedDialog)}
        clearOpenSetupQuery={shouldAutoOpenSetupDialog}
      />

      <AppShell activeTab={activeTab}>
        {activeTab === "home" ? (
          <AppHomeTab
            activeSubscription={subscriptionData.activeSubscription}
            autoOpenSetupDialog={shouldAutoOpenSetupDialog}
            canExtendSubscription={canExtendSubscription}
            credits={benefitsData.user.credits}
            currentActiveSubscriptionsCount={serviceCapacityState.activeSubscriptionsCount}
            durationRules={constructorData.durationRules}
            firstPurchaseDiscountPct={benefitsData.firstPurchaseDiscountPct}
            isCapacityBlockedForNewSubscriptions={isCapacityBlockedForNewSubscriptions}
            latestSubscriptionStatus={latestSubscriptionStatus}
            maxActiveSubscriptions={serviceCapacityState.maxActiveSubscriptions}
            plategaPaymentRequestId={plategaPaymentRequestId ?? null}
            pricingSettings={constructorData.pricingSettings}
          />
        ) : null}

        {activeTab === "devices" ? (
          <AppDevicesTab
            activeSubscription={subscriptionData.activeSubscription}
            canExtendSubscription={canExtendSubscription}
            credits={benefitsData.user.credits}
            currentActiveSubscriptionsCount={serviceCapacityState.activeSubscriptionsCount}
            durationRules={constructorData.durationRules}
            firstPurchaseDiscountPct={benefitsData.firstPurchaseDiscountPct}
            isCapacityBlockedForNewSubscriptions={isCapacityBlockedForNewSubscriptions}
            maxActiveSubscriptions={serviceCapacityState.maxActiveSubscriptions}
            plategaPaymentRequestId={plategaPaymentRequestId ?? null}
            pricingSettings={constructorData.pricingSettings}
          />
        ) : null}

        {activeTab === "referrals" ? (
          <AppReferralsTab
            canGenerateReferralCode={benefitsData.canGenerateReferralCode}
            canExtendSubscription={canExtendSubscription}
            credits={benefitsData.user.credits}
            currentActiveSubscriptionsCount={serviceCapacityState.activeSubscriptionsCount}
            durationRules={constructorData.durationRules}
            firstPurchaseDiscountPct={benefitsData.firstPurchaseDiscountPct}
            hasApprovedPayment={benefitsData.hasApprovedPayment}
            isCapacityBlockedForNewSubscriptions={isCapacityBlockedForNewSubscriptions}
            maxActiveSubscriptions={serviceCapacityState.maxActiveSubscriptions}
            ownReferralCode={benefitsData.ownReferralCode?.code ?? null}
            plategaPaymentRequestId={plategaPaymentRequestId ?? null}
            payout={benefitsData.payout}
            pricingSettings={constructorData.pricingSettings}
            recentReferralActivity={benefitsData.recentReferralActivity}
            referralProgramSettings={benefitsData.referralProgramSettings}
            referralStats={benefitsData.referralStats}
            usesCount={benefitsData.ownReferralCode?._count.uses ?? 0}
          />
        ) : null}

        {activeTab === "profile" ? (
          <AppProfileTab
            legalDocuments={legalDocuments}
            username={benefitsData.user.username}
          />
        ) : null}
      </AppShell>
    </main>
  )
}
