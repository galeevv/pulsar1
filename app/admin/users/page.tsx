import { AdminUsersSection } from "@/components/admin/admin-users-section";
import { getAdminDashboardData } from "@/lib/admin-code-management";

export default async function AdminUsersPage() {
  const dashboardData = await getAdminDashboardData();

  return <AdminUsersSection users={dashboardData.users} />;
}
