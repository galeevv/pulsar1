import { AdminPaymentsSection } from "@/components/admin/admin-payments-section";
import { getAdminPaymentsPageData } from "@/lib/admin/get-admin-payments-page-data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const data = await getAdminPaymentsPageData(resolvedSearchParams);

  return <AdminPaymentsSection data={data} />;
}
