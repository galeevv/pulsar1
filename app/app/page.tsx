import { redirect } from "next/navigation";

import { AppFeedbackToast } from "@/app/app/app-feedback-toast";
import { AppDashboardPrototypeSection } from "@/components/app/app-dashboard-prototype-section";
import { AppHeader } from "@/components/app/app-header";
import { AppTariffsSection } from "@/components/app/app-tariffs-section";
import { AppUrlQueryCleanup } from "@/components/app/app-url-query-cleanup";
import { getAppBenefitsData } from "@/lib/app-benefits";
import { getCurrentSession } from "@/lib/auth";
import { getLegalDocuments } from "@/lib/legal-documents";
import { getServiceCapacityState } from "@/lib/service-capacity";
import { getAppSubscriptionConstructorData } from "@/lib/subscription-constructor";
import { getAppSubscriptionData } from "@/lib/subscription-management";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function decodeSearchParam(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function AppPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  if (session.role !== "USER") {
    redirect("/admin");
  }

  const resolvedSearchParams = await searchParams;
  const error = getValue(resolvedSearchParams, "error");
  const notice = getValue(resolvedSearchParams, "notice");
  const dialog = getValue(resolvedSearchParams, "dialog");
  const shouldAutoOpenSetupDialog = getValue(resolvedSearchParams, "openSetup") === "1";
  const plategaPaymentRequestId = getValue(
    resolvedSearchParams,
    "plategaPaymentRequestId"
  );
  const defaultDashboardDialog =
    dialog === "promo" || dialog === "referral" ? dialog : null;
  const [
    benefitsData,
    subscriptionData,
    constructorData,
    serviceCapacityState,
    legalDocuments,
  ] = await Promise.all([
    getAppBenefitsData(session.username),
    getAppSubscriptionData(session.username),
    getAppSubscriptionConstructorData(),
    getServiceCapacityState(),
    getLegalDocuments(),
  ]);

  if (!benefitsData || !subscriptionData) {
    redirect("/");
  }

  const activeSubscriptionStartAt = subscriptionData.activeSubscription
    ? subscriptionData.activeSubscription.startsAt ?? subscriptionData.activeSubscription.startedAt
    : null;
  const activeSubscriptionEndAt = subscriptionData.activeSubscription
    ? subscriptionData.activeSubscription.expiresAt ?? subscriptionData.activeSubscription.endsAt
    : null;
  const canExtendSubscription =
    !subscriptionData.activeSubscription ||
    subscriptionData.activeSubscription.paymentRequest?.status === "APPROVED";
  const isNewUserWithoutActiveSubscription = !subscriptionData.activeSubscription;
  const isCapacityBlockedForNewSubscriptions =
    isNewUserWithoutActiveSubscription && serviceCapacityState.isLimitReached;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppFeedbackToast
        error={decodeSearchParam(error)}
        notice={decodeSearchParam(notice)}
      />

      <AppHeader />
      <AppUrlQueryCleanup
        clearDialogQuery={Boolean(defaultDashboardDialog)}
        clearOpenSetupQuery={shouldAutoOpenSetupDialog}
      />

      <div className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-8">
        <AppTariffsSection
          activeSubscriptionEndAtIso={activeSubscriptionEndAt?.toISOString() ?? null}
          activeSubscriptionStartAtIso={activeSubscriptionStartAt?.toISOString() ?? null}
          autoOpenSetupDialog={shouldAutoOpenSetupDialog}
          canExtendSubscription={canExtendSubscription}
          credits={benefitsData.user.credits}
          durationRules={constructorData.durationRules}
          firstPurchaseDiscountPct={benefitsData.firstPurchaseDiscountPct}
          isCapacityBlockedForNewSubscriptions={isCapacityBlockedForNewSubscriptions}
          maxActiveSubscriptions={serviceCapacityState.maxActiveSubscriptions}
          pricingSettings={constructorData.pricingSettings}
          plategaPaymentRequestId={plategaPaymentRequestId ?? null}
          setupSubscriptionUrl={subscriptionData.activeSubscription?.subscriptionUrl ?? null}
          currentActiveSubscriptionsCount={serviceCapacityState.activeSubscriptionsCount}
        />
        <AppDashboardPrototypeSection
          activeSubscription={subscriptionData.activeSubscription}
          canGenerateReferralCode={benefitsData.canGenerateReferralCode}
          credits={benefitsData.user.credits}
          hasApprovedPayment={benefitsData.hasApprovedPayment}
          ownReferralCode={benefitsData.ownReferralCode}
          payout={benefitsData.payout}
          promoCodeRedemptions={benefitsData.promoCodeRedemptions}
          recentReferralActivity={benefitsData.recentReferralActivity}
          referralProgramSettings={benefitsData.referralProgramSettings}
          referralStats={benefitsData.referralStats}
          legalDocuments={legalDocuments}
          username={benefitsData.user.username}
          defaultDialog={defaultDashboardDialog}
        />
      </div>
    </main>
  );
}
