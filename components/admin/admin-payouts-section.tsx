"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BadgeDollarSign, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Wallet } from "lucide-react";

import { updateMinimumPayoutCreditsAction } from "@/app/admin/payout-actions";
import { AdminSectionShell } from "@/components/admin/admin-section-shell";
import { AdminSurface } from "@/components/admin/admin-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import type {
  AdminPayoutPageSize,
  AdminPayoutSort,
  AdminPayoutStatusFilter,
  AdminPayoutsPageData,
} from "@/lib/admin/admin-payouts-types";

import { AdminPayoutDetailsSheet } from "./payouts/admin-payout-details-sheet";
import { AdminPayoutsMobileList } from "./payouts/admin-payouts-mobile-list";
import { formatRub } from "./payouts/admin-payouts-presenters";
import { AdminPayoutsTable } from "./payouts/admin-payouts-table";
import { AdminPayoutsToolbar } from "./payouts/admin-payouts-toolbar";

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 1) {
    return [1];
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);

  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];

  for (let index = 0; index < sortedPages.length; index += 1) {
    const page = sortedPages[index];
    const previousPage = sortedPages[index - 1];

    if (index > 0 && previousPage !== undefined && page - previousPage > 1) {
      result.push("ellipsis");
    }

    result.push(page);
  }

  return result;
}

function SummaryCard({
  icon: Icon,
  title,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  value: string;
}) {
  return (
    <AdminSurface className="p-4 md:p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex size-8 items-center justify-center rounded-card bg-transparent">
          <Icon className="size-5 text-muted-foreground" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold leading-none tracking-tight">{value}</p>
    </AdminSurface>
  );
}

export function AdminPayoutsSection({
  data,
}: {
  data: AdminPayoutsPageData;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);

  const paginationItems = useMemo(
    () => buildPaginationItems(data.filters.page, data.pagination.totalPages),
    [data.filters.page, data.pagination.totalPages]
  );
  const selectedPayout = useMemo(
    () => data.rows.find((item) => item.id === selectedPayoutId) ?? null,
    [data.rows, selectedPayoutId]
  );
  const redirectPath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  function buildHref(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        params.delete(key);
        continue;
      }

      params.set(key, value);
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function navigate(updates: Record<string, string | undefined>) {
    router.replace(buildHref(updates), { scroll: false });
  }

  function handleQuerySubmit(query: string) {
    navigate({
      page: "1",
      query: query || undefined,
    });
  }

  function handleStatusChange(value: AdminPayoutStatusFilter) {
    navigate({
      page: "1",
      status: value === "all" ? undefined : value,
    });
  }

  function handleSortChange(value: AdminPayoutSort) {
    navigate({
      page: "1",
      sort: value === "newest" ? undefined : value,
    });
  }

  function handlePageSizeChange(value: AdminPayoutPageSize) {
    navigate({
      page: "1",
      pageSize: value === 20 ? undefined : String(value),
    });
  }

  function handleReset() {
    navigate({
      page: undefined,
      pageSize: undefined,
      query: undefined,
      sort: undefined,
      status: undefined,
    });
  }

  function handlePageChange(page: number) {
    navigate({
      page: String(page),
    });
  }

  const emptyTitle =
    data.summary.totalPayoutRequests === 0 ? "No payout requests yet" : "No matching payout requests";
  const emptyDescription =
    data.summary.totalPayoutRequests === 0
      ? "Withdrawal requests will appear here after users submit payouts."
      : "Try adjusting search or filters.";

  return (
    <AdminSectionShell
      description="Review, approve, reject, and mark referral payout requests as paid."
      eyebrow="Referral withdrawals"
      id="payouts"
      title="Payouts"
    >
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={Clock3} title="Pending Payouts" value={String(data.summary.pendingPayouts)} />
          <SummaryCard icon={CheckCircle2} title="Approved Payouts" value={String(data.summary.approvedPayouts)} />
          <SummaryCard icon={Wallet} title="Paid Out Total" value={formatRub(data.summary.paidOutRub)} />
          <SummaryCard icon={BadgeDollarSign} title="Payout Volume" value={formatRub(data.summary.payoutVolumeRub)} />
        </div>

        <AdminSurface className="p-4 md:p-4">
          <AdminPayoutsToolbar
            filters={data.filters}
            onPageSizeChange={handlePageSizeChange}
            onQuerySubmit={handleQuerySubmit}
            onReset={handleReset}
            onSortChange={handleSortChange}
            onStatusChange={handleStatusChange}
          />
        </AdminSurface>

        <AdminSurface className="overflow-hidden p-0">
          {data.rows.length ? (
            <>
              <AdminPayoutsTable
                onViewDetails={setSelectedPayoutId}
                rows={data.rows}
              />
              <AdminPayoutsMobileList
                onViewDetails={setSelectedPayoutId}
                rows={data.rows}
              />

              <div className="grid gap-3 border-t border-border/70 p-4 md:grid-cols-[2fr_1fr] md:items-center">
                <div className="text-sm text-muted-foreground">
                  Showing {data.pagination.from}-{data.pagination.to} of {data.pagination.total} payout requests
                </div>

                <Pagination className="justify-start md:justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationLink
                        aria-label="Previous page"
                        className={
                          data.filters.page <= 1 ? "pointer-events-none opacity-50" : undefined
                        }
                        href={buildHref({
                          page: String(Math.max(1, data.filters.page - 1)),
                        })}
                        onClick={(event) => {
                          event.preventDefault();
                          handlePageChange(Math.max(1, data.filters.page - 1));
                        }}
                      >
                        <ChevronLeft className="size-4" />
                      </PaginationLink>
                    </PaginationItem>

                    {paginationItems.map((item, index) =>
                      item === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${index}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={item}>
                          <PaginationLink
                            href={buildHref({
                              page: String(item),
                            })}
                            isActive={item === data.filters.page}
                            onClick={(event) => {
                              event.preventDefault();
                              handlePageChange(item);
                            }}
                          >
                            {item}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}

                    <PaginationItem>
                      <PaginationLink
                        aria-label="Next page"
                        className={
                          data.filters.page >= data.pagination.totalPages
                            ? "pointer-events-none opacity-50"
                            : undefined
                        }
                        href={buildHref({
                          page: String(
                            Math.min(data.pagination.totalPages, data.filters.page + 1)
                          ),
                        })}
                        onClick={(event) => {
                          event.preventDefault();
                          handlePageChange(
                            Math.min(data.pagination.totalPages, data.filters.page + 1)
                          );
                        }}
                      >
                        <ChevronRight className="size-4" />
                      </PaginationLink>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          ) : (
            <div className="px-4 py-12 text-center md:px-6">
              <Badge className="mb-3" variant="secondary">
                Payouts
              </Badge>
              <h3 className="text-lg font-semibold">{emptyTitle}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
            </div>
          )}
        </AdminSurface>

        <AdminSurface className="p-4 md:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Minimum payout amount</p>
              <p className="text-sm text-muted-foreground">
                This value is used for new payout requests in the app referral dialog.
              </p>
            </div>
            <form action={updateMinimumPayoutCreditsAction} className="flex w-full gap-2 sm:w-auto">
              <input name="redirectPath" type="hidden" value={redirectPath} />
              <Input
                className="w-full sm:w-[180px]"
                defaultValue={data.summary.minimumPayoutCredits}
                min={1}
                name="minimumPayoutCredits"
                required
                type="number"
              />
              <Button radius="card" type="submit" variant="outline">
                Save
              </Button>
            </form>
          </div>
        </AdminSurface>
      </div>

      <AdminPayoutDetailsSheet
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPayoutId(null);
          }
        }}
        open={Boolean(selectedPayoutId && selectedPayout)}
        payout={selectedPayout}
        redirectPath={redirectPath}
      />
    </AdminSectionShell>
  );
}

