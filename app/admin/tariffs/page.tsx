import { AdminTariffsSection } from "@/components/admin/admin-tariffs-section";
import { getAdminDashboardData } from "@/lib/admin-code-management";

export default async function AdminTariffsPage() {
  const dashboardData = await getAdminDashboardData();

  return (
    <AdminTariffsSection
      durationRules={dashboardData.subscriptionDurationRules}
      pricingSettings={dashboardData.subscriptionPricingSettings}
    />
  );
}
