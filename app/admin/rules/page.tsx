import { AdminRulesSection } from "@/components/admin/admin-rules-section";
import { getAdminDashboardData } from "@/lib/admin-code-management";

export default async function AdminRulesPage() {
  const dashboardData = await getAdminDashboardData();

  return <AdminRulesSection legalDocuments={dashboardData.legalDocuments} />;
}
