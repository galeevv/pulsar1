import { ChevronDownIcon, CircleDollarSignIcon, GiftIcon, UsersIcon } from "lucide-react"

import {
  CancelPayoutRequestForm,
  CreatePayoutRequestForm,
} from "@/components/app/app-dashboard-dialog-actions"
import { EmptyStateBlock } from "@/components/app/empty-state-block"
import { QuickActionsSheet } from "@/components/app/quick-actions-sheet"
import { ReferralHistoryList } from "@/components/app/referral-history-list"
import { ReferralSummaryCard } from "@/components/app/referral-summary-card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AppReferralsTab({
  canGenerateReferralCode,
  canExtendSubscription,
  credits,
  currentActiveSubscriptionsCount,
  durationRules,
  firstPurchaseDiscountPct,
  hasApprovedPayment,
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
  hasApprovedPayment: boolean
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

  const hasReferralActivity =
    referralStats.totalInvitedCount > 0 || recentReferralActivity.length > 0

  return (
    <section className="space-y-4">
      <ReferralSummaryCard
        canGenerateReferralCode={canGenerateReferralCode}
        discountPct={referralProgramSettings.defaultDiscountPct}
        hasApprovedPayment={hasApprovedPayment}
        isReferralEnabled={referralProgramSettings.isEnabled}
        ownReferralCode={ownReferralCode}
        rewardCredits={referralProgramSettings.defaultRewardCredits}
        usesCount={usesCount}
      />

      <Tabs defaultValue="summary">
        <TabsList
          className="grid w-full grid-cols-2 rounded-card border border-border/70 bg-card/30 p-1"
          variant="outline"
        >
          <TabsTrigger value="summary">Сводка</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-3 space-y-3" value="summary">
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-border/70 bg-card/40">
              <CardHeader className="p-3">
                <CardTitle className="inline-flex items-center gap-2 text-sm">
                  <UsersIcon className="size-4 text-muted-foreground" />
                  Приглашено
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-lg font-semibold">{referralStats.totalInvitedCount}</p>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/40">
              <CardHeader className="p-3">
                <CardTitle className="inline-flex items-center gap-2 text-sm">
                  <GiftIcon className="size-4 text-muted-foreground" />
                  Начислено
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-lg font-semibold">{referralStats.totalEarnedCredits} credits</p>
              </CardContent>
            </Card>
          </div>

          {!hasReferralActivity ? (
            <EmptyStateBlock
              description="Поделитесь кодом, чтобы увидеть первые начисления."
              title="Нет реферальной активности"
            />
          ) : null}

          <Collapsible className="rounded-card border border-border/70 bg-card/40">
            <CollapsibleTrigger asChild>
              <Button className="w-full justify-between rounded-card px-3 py-3" radius="card" variant="ghost">
                <span className="inline-flex items-center gap-2">
                  <CircleDollarSignIcon className="size-4 text-muted-foreground" />
                  Вывод средств
                </span>
                <ChevronDownIcon className="size-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 p-3 pt-0">
              <Separator />
              <div className="rounded-card border border-border/70 bg-background/40 p-3 text-sm">
                <p>Доступно: {payout.availableCredits} credits</p>
                <p>В резерве: {payout.reservedCredits} credits</p>
                <p>Минимум для вывода: {payout.minimumPayoutCredits} credits</p>
                <p>Всего выплачено: {payout.totalPaidOutCredits} credits</p>
              </div>

              {payout.activeRequest ? (
                <div className="rounded-card border border-border/70 bg-background/40 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Активная заявка</p>
                    <Badge variant="warning">{payout.activeRequest.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {payout.activeRequest.amountRub} ₽ / {payout.activeRequest.amountCredits} credits
                  </p>
                  {payout.activeRequest.status === "PENDING" ? (
                    <CancelPayoutRequestForm payoutRequestId={payout.activeRequest.id} />
                  ) : null}
                </div>
              ) : (
                <CreatePayoutRequestForm minimumPayoutCredits={payout.minimumPayoutCredits} />
              )}
            </CollapsibleContent>
          </Collapsible>

          <Card className="border-border/70 bg-card/40">
            <CardHeader className="p-4">
              <CardTitle className="text-base">Как это работает</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Accordion collapsible type="single">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Когда начисляется награда?</AccordionTrigger>
                  <AccordionContent>
                    После первой подтвержденной оплаты приглашенного пользователя.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Как вывести накопленные кредиты?</AccordionTrigger>
                  <AccordionContent>
                    Откройте блок «Вывод средств», укажите реквизиты и сумму не ниже минимального порога.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Что получает приглашенный пользователь?</AccordionTrigger>
                  <AccordionContent>
                    Скидку {referralProgramSettings.defaultDiscountPct}% на первую покупку.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-3" value="history">
          <ReferralHistoryList
            payouts={payout.recentRequests}
            rewards={recentReferralActivity.map((item) => ({
              createdAt: item.createdAt,
              id: item.id,
              referredUsername: item.referredUsername,
              rewardCreditsSnapshot: item.rewardCreditsSnapshot,
              rewardGrantedAt: item.rewardGrantedAt,
            }))}
          />
        </TabsContent>
      </Tabs>
    </section>
  )
}
