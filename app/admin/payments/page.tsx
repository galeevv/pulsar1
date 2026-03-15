import { AdminPaymentsSection } from "@/components/admin/admin-payments-section";
import { getAdminDashboardData } from "@/lib/admin-code-management";

export default async function AdminPaymentsPage() {
  const dashboardData = await getAdminDashboardData();

  return <AdminPaymentsSection paymentRequests={dashboardData.paymentRequests} />;
}
