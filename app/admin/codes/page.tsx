import { AdminMarketingSection } from "@/components/admin/admin-marketing-section";
import { getAdminDashboardData } from "@/lib/admin-code-management";

export default async function AdminCodesPage() {
  const dashboardData = await getAdminDashboardData();

  return (
    <AdminMarketingSection
      inviteCodes={dashboardData.inviteCodes}
      promoCodes={dashboardData.promoCodes}
      referralCodes={dashboardData.referralCodes}
      referralProgramSettings={dashboardData.referralProgramSettings}
    />
  );
}
