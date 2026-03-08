import { redirect } from "next/navigation";

import { AppFeedbackToast } from "@/app/app/app-feedback-toast";
import { AppBenefitsSection } from "@/components/app/app-benefits-section";
import { AppHeader } from "@/components/app/app-header";
import { AppOverviewSection } from "@/components/app/app-overview-section";
import { AppTariffsSection } from "@/components/app/app-tariffs-section";
import { getAppBenefitsData } from "@/lib/app-benefits";
import { getCurrentSession } from "@/lib/auth";
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
  const [benefitsData, subscriptionData, constructorData] = await Promise.all([
    getAppBenefitsData(session.username),
    getAppSubscriptionData(session.username),
    getAppSubscriptionConstructorData(),
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

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppFeedbackToast
        error={decodeSearchParam(error)}
        notice={decodeSearchParam(notice)}
      />

      <AppHeader />

      <div className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-8">
        <AppTariffsSection
          activeSubscriptionEndAtIso={activeSubscriptionEndAt?.toISOString() ?? null}
          activeSubscriptionStartAtIso={activeSubscriptionStartAt?.toISOString() ?? null}
          canExtendSubscription={canExtendSubscription}
          credits={benefitsData.user.credits}
          durationRules={constructorData.durationRules}
          firstPurchaseDiscountPct={benefitsData.firstPurchaseDiscountPct}
          pricingSettings={constructorData.pricingSettings}
        />
        <AppOverviewSection
          activeSubscription={subscriptionData.activeSubscription}
          credits={benefitsData.user.credits}
          referralStats={benefitsData.referralStats}
          username={benefitsData.user.username}
        />
        <AppBenefitsSection
          canGenerateReferralCode={benefitsData.canGenerateReferralCode}
          hasApprovedPayment={benefitsData.hasApprovedPayment}
          ownReferralCode={benefitsData.ownReferralCode}
          promoCodeRedemptions={benefitsData.promoCodeRedemptions}
          referralProgramSettings={benefitsData.referralProgramSettings}
        />
      </div>
    </main>
  );
}
