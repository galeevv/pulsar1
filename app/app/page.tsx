import { redirect } from "next/navigation";

import { AppFeedbackToast } from "@/app/app/app-feedback-toast";
import { AppBenefitsSection } from "@/components/app/app-benefits-section";
import { AppDevicesSection } from "@/components/app/app-devices-section";
import { AppHeader } from "@/components/app/app-header";
import { AppOverviewSection } from "@/components/app/app-overview-section";
import { AppPaymentsSection } from "@/components/app/app-payments-section";
import { AppProfileSection } from "@/components/app/app-profile-section";
import { AppSubscriptionSection } from "@/components/app/app-subscription-section";
import { AppTariffsSection } from "@/components/app/app-tariffs-section";
import { getAppBenefitsData } from "@/lib/app-benefits";
import { getCurrentSession } from "@/lib/auth";
import { getAppPaymentsData } from "@/lib/payment-management";
import { getAppSubscriptionData } from "@/lib/subscription-management";
import { getActiveTariffs } from "@/lib/tariff-management";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AppPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?mode=login&error=Сначала войдите в аккаунт.");
  }

  if (session.role !== "USER") {
    redirect("/admin");
  }

  const resolvedSearchParams = await searchParams;
  const error = getValue(resolvedSearchParams, "error");
  const notice = getValue(resolvedSearchParams, "notice");
  const [benefitsData, paymentsData, subscriptionData, tariffs] = await Promise.all([
    getAppBenefitsData(session.username),
    getAppPaymentsData(session.username),
    getAppSubscriptionData(session.username),
    getActiveTariffs(),
  ]);

  if (!benefitsData || !paymentsData || !subscriptionData) {
    redirect("/login?mode=login&error=Сначала войдите в аккаунт.");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppFeedbackToast
        error={error ? decodeURIComponent(error) : undefined}
        notice={notice ? decodeURIComponent(notice) : undefined}
      />

      <AppHeader />

      <div className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-8">
        <AppOverviewSection credits={benefitsData.user.credits} />
        <AppProfileSection credits={benefitsData.user.credits} username={session.username} />
        <AppTariffsSection tariffs={tariffs} />
        <AppPaymentsSection
          openPaymentRequest={paymentsData.openPaymentRequest}
          paymentRequests={paymentsData.paymentRequests}
          tariffs={tariffs}
        />
        <AppSubscriptionSection
          activeSubscription={subscriptionData.activeSubscription}
          latestSubscriptions={subscriptionData.latestSubscriptions}
        />
        <AppDevicesSection deviceSlots={subscriptionData.activeSubscription?.deviceSlots ?? []} />
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
