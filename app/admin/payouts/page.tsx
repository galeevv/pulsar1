import { AdminPayoutsSection } from "@/components/admin/admin-payouts-section";
import { getAdminPayoutsPageData } from "@/lib/admin/get-admin-payouts-page-data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const data = await getAdminPayoutsPageData(resolvedSearchParams);

  return <AdminPayoutsSection data={data} />;
}
