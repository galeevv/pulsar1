import Image from "next/image"

import { EmptyStateBlock } from "@/components/app/empty-state-block"
import { QuickActionsSheet } from "@/components/app/quick-actions-sheet"
import { ReferralAnalyticsDrawer } from "@/components/app/referral-analytics-drawer"
import { ReferralHistoryDrawer } from "@/components/app/referral-history-drawer"
import { ReferralPayoutDrawer } from "@/components/app/referral-payout-drawer"
import { ReferralSummaryCard } from "@/components/app/referral-summary-card"
import { Card, CardContent, CardTitle } from "@/components/ui/card"

export function AppReferralsTab({
  canGenerateReferralCode,
  canExtendSubscription,
  credits,
  currentActiveSubscriptionsCount,
  durationRules,
  firstPurchaseDiscountPct,
  isCapacityBlockedForNewSubscriptions,
  maxActiveSubscriptions,
  ownReferralCode,
  plategaPaymentRequestId,
  payout,
  pricingSettings,
  recentReferralActivity,
  referralProgramSettings,
  referralStats,
  usesCount,
}: {
  canGenerateReferralCode: boolean
  canExtendSubscription: boolean
  credits: number
  currentActiveSubscriptionsCount: number
  durationRules: Array<{
    discountPercent: number
    id: string
    monthlyPrice: number
    months: number
  }>
  firstPurchaseDiscountPct: number
  isCapacityBlockedForNewSubscriptions: boolean
  maxActiveSubscriptions: number
  ownReferralCode: string | null
  plategaPaymentRequestId: string | null
  payout: {
    activeRequest: {
      amountCredits: number
      amountRub: number
      createdAt: Date
      id: string
      status: "APPROVED" | "CANCELED" | "PAID" | "PENDING" | "REJECTED"
    } | null
    availableCredits: number
    minimumPayoutCredits: number
    recentRequests: Array<{
      amountCredits: number
      amountRub: number
      createdAt: Date
      id: string
      rejectionReason: string | null
      status: "APPROVED" | "CANCELED" | "PAID" | "PENDING" | "REJECTED"
    }>
    reservedCredits: number
    totalPaidOutCredits: number
  }
  pricingSettings: {
    baseDeviceMonthlyPrice: number
    extraDeviceMonthlyPrice: number
    maxDevices: number
    minDevices: number
  }
  recentReferralActivity: Array<{
    createdAt: Date
    discountPctSnapshot: number
    id: string
    referredUsername: string
    rewardCreditsSnapshot: number
    rewardGrantedAt: Date | null
  }>
  referralProgramSettings: {
    defaultDiscountPct: number
    defaultRewardCredits: number
    isEnabled: boolean
    minimumPayoutCredits: number
  }
  referralStats: {
    confirmedInvitedCount: number
    conversionRatePct: number
    totalEarnedCredits: number
    totalInvitedCount: number
  }
  usesCount: number
}) {
  if (!canGenerateReferralCode && !ownReferralCode) {
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
              fullWidthTrigger={false}
              isCapacityBlockedForNewSubscriptions={isCapacityBlockedForNewSubscriptions}
              maxActiveSubscriptions={maxActiveSubscriptions}
              plategaPaymentRequestId={plategaPaymentRequestId}
              pricingSettings={pricingSettings}
              triggerLabel="Купить подписку"
            />
          }
          description="Реферальная система будет доступна после первой подтвержденной оплаты."
          title="Реферальная система пока недоступна"
        />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <Card className="gap-0 overflow-hidden border-border/70 bg-card/40 py-0">
        <div className="relative aspect-[16/9] w-full border-b border-border/70 bg-transparent">
          <Image
            alt="Реферальная система PulsarVPN"
            className="object-contain p-0"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 460px"
            src="/details/physics.gif"
            unoptimized
          />
        </div>

        <CardContent className="space-y-4 p-4">
          <CardTitle className="text-lg">Реферальная система</CardTitle>

          <ReferralSummaryCard
            canGenerateReferralCode={canGenerateReferralCode}
            discountPct={referralProgramSettings.defaultDiscountPct}
            ownReferralCode={ownReferralCode}
            rewardCredits={referralProgramSettings.defaultRewardCredits}
            usesCount={usesCount}
          />

          <div className="grid grid-cols-2 gap-2">
            <ReferralHistoryDrawer
              payouts={payout.recentRequests}
              rewards={recentReferralActivity.map((item) => ({
                createdAt: item.createdAt,
                id: item.id,
                referredUsername: item.referredUsername,
                rewardCreditsSnapshot: item.rewardCreditsSnapshot,
                rewardGrantedAt: item.rewardGrantedAt,
              }))}
            />
            <ReferralPayoutDrawer payout={payout} />
          </div>

          <ReferralAnalyticsDrawer
            payout={payout}
            referralStats={referralStats}
          />
        </CardContent>
      </Card>
    </section>
  )
}
