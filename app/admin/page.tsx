import { redirect } from "next/navigation";

import { AdminFeedbackToast } from "@/app/admin/admin-feedback-toast";
import { AdminAccountSection } from "@/components/admin/admin-account-section";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminInviteCodesSection } from "@/components/admin/admin-invite-codes-section";
import { AdminOperationsSection } from "@/components/admin/admin-operations-section";
import { AdminOverviewSection } from "@/components/admin/admin-overview-section";
import { AdminPaymentsSection } from "@/components/admin/admin-payments-section";
import { AdminPromoCodesSection } from "@/components/admin/admin-promo-codes-section";
import { AdminReferralCodesSection } from "@/components/admin/admin-referral-codes-section";
import { AdminRulesSection } from "@/components/admin/admin-rules-section";
import { AdminSupportSection } from "@/components/admin/admin-support-section";
import { AdminTariffsSection } from "@/components/admin/admin-tariffs-section";
import { AdminUsersSection } from "@/components/admin/admin-users-section";
import { getCurrentSession } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/admin-code-management";

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

export default async function AdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  if (session.role !== "ADMIN") {
    redirect("/app");
  }

  const resolvedSearchParams = await searchParams;
  const error = getValue(resolvedSearchParams, "error");
  const notice = getValue(resolvedSearchParams, "notice");
  const dashboardData = await getAdminDashboardData();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AdminFeedbackToast
        error={decodeSearchParam(error)}
        notice={decodeSearchParam(notice)}
      />

      <AdminHeader />

      <div className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-8">
        <AdminOverviewSection />
        <AdminAccountSection currentUsername={session.username} />
        <AdminUsersSection users={dashboardData.users} />
        <AdminInviteCodesSection inviteCodes={dashboardData.inviteCodes} />
        <AdminReferralCodesSection
          referralCodes={dashboardData.referralCodes}
          referralProgramSettings={dashboardData.referralProgramSettings}
        />
        <AdminPromoCodesSection promoCodes={dashboardData.promoCodes} />
        <AdminRulesSection legalDocuments={dashboardData.legalDocuments} />
        <AdminTariffsSection
          durationRules={dashboardData.subscriptionDurationRules}
          pricingSettings={dashboardData.subscriptionPricingSettings}
        />
        <AdminPaymentsSection paymentRequests={dashboardData.paymentRequests} />
        <AdminSupportSection />
        <AdminOperationsSection
          deviceSlotStats={dashboardData.deviceSlotStats}
          recentSubscriptions={dashboardData.recentSubscriptions}
          serviceCapacitySettings={dashboardData.serviceCapacitySettings}
          subscriptionStats={dashboardData.subscriptionStats}
        />
      </div>
    </main>
  );
}
