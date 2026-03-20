"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, ReceiptText, Wallet } from "lucide-react";

import { AdminSectionShell } from "@/components/admin/admin-section-shell";
import { AdminSurface } from "@/components/admin/admin-surface";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import type {
  AdminPaymentMethodFilter,
  AdminPaymentsPageData,
  AdminPaymentsPageSize,
  AdminPaymentsSort,
  AdminPaymentStatusFilter,
} from "@/lib/admin/admin-payments-types";

import { AdminPaymentDetailsSheet } from "./payments/admin-payment-details-sheet";
import { AdminPaymentsMobileList } from "./payments/admin-payments-mobile-list";
import { AdminPaymentsTable } from "./payments/admin-payments-table";
import { formatRub } from "./payments/admin-payments-presenters";
import { AdminPaymentsToolbar } from "./payments/admin-payments-toolbar";

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

export function AdminPaymentsSection({
  data,
}: {
  data: AdminPaymentsPageData;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const paginationItems = useMemo(
    () => buildPaginationItems(data.filters.page, data.pagination.totalPages),
    [data.filters.page, data.pagination.totalPages]
  );
  const selectedPayment = useMemo(
    () => data.rows.find((item) => item.id === selectedPaymentId) ?? null,
    [data.rows, selectedPaymentId]
  );

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

  function handleStatusChange(value: AdminPaymentStatusFilter) {
    navigate({
      page: "1",
      status: value === "all" ? undefined : value,
    });
  }

  function handleMethodChange(value: AdminPaymentMethodFilter) {
    navigate({
      method: value === "all" ? undefined : value,
      page: "1",
    });
  }

  function handleSortChange(value: AdminPaymentsSort) {
    navigate({
      page: "1",
      sort: value === "newest" ? undefined : value,
    });
  }

  function handlePageSizeChange(value: AdminPaymentsPageSize) {
    navigate({
      page: "1",
      pageSize: value === 20 ? undefined : String(value),
    });
  }

  function handleReset() {
    navigate({
      method: undefined,
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
    data.summary.totalPayments === 0 ? "No payments yet" : "No matching payments";
  const emptyDescription =
    data.summary.totalPayments === 0
      ? "Payment requests will appear here after users start checkout."
      : "Try adjusting search or filters.";

  return (
    <AdminSectionShell
      description="Monitor payment requests, statuses, pricing snapshots, and subscription outcomes."
      eyebrow="Financial activity"
      id="payments"
      title="Payments"
    >
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={ReceiptText} title="Total Payments" value={String(data.summary.totalPayments)} />
          <SummaryCard icon={CheckCircle2} title="Approved" value={String(data.summary.approvedPayments)} />
          <SummaryCard icon={Clock3} title="Pending" value={String(data.summary.pendingPayments)} />
          <SummaryCard icon={Wallet} title="Revenue" value={formatRub(data.summary.revenueRub)} />
        </div>

        <AdminSurface className="p-4 md:p-4">
          <AdminPaymentsToolbar
            filters={data.filters}
            onMethodChange={handleMethodChange}
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
              <AdminPaymentsTable onViewDetails={setSelectedPaymentId} rows={data.rows} />
              <AdminPaymentsMobileList onViewDetails={setSelectedPaymentId} rows={data.rows} />

              <div className="grid gap-3 border-t border-border/70 p-4 md:grid-cols-[2fr_1fr] md:items-center">
                <div className="text-sm text-muted-foreground">
                  Showing {data.pagination.from}-{data.pagination.to} of {data.pagination.total} payments
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
                Payments
              </Badge>
              <h3 className="text-lg font-semibold">{emptyTitle}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
            </div>
          )}
        </AdminSurface>
      </div>

      <AdminPaymentDetailsSheet
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPaymentId(null);
          }
        }}
        open={Boolean(selectedPaymentId && selectedPayment)}
        payment={selectedPayment}
      />
    </AdminSectionShell>
  );
}
