import { AdminOperationsSection } from "@/components/admin/admin-operations-section";
import { getAdminDashboardData } from "@/lib/admin-code-management";

export default async function AdminOperationsPage() {
  const dashboardData = await getAdminDashboardData();

  return (
    <AdminOperationsSection
      deviceSlotStats={dashboardData.deviceSlotStats}
      recentSubscriptions={dashboardData.recentSubscriptions}
      serviceCapacitySettings={dashboardData.serviceCapacitySettings}
      subscriptionStats={dashboardData.subscriptionStats}
    />
  );
}
