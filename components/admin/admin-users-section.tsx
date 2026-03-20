"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { AdminStatusPill } from "@/components/admin/admin-status-pill";
import { AdminSectionShell } from "@/components/admin/admin-section-shell";
import { AdminSurface } from "@/components/admin/admin-surface";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SubscriptionFilter = "all" | "active" | "expired" | "none" | "revoked";
type UsersSort =
  | "newest"
  | "oldest"
  | "credits_desc"
  | "last_payment_desc"
  | "active_subscription_first";

export type AdminUsersListItem = {
  createdAt: string;
  credits: number;
  devices: number | null;
  id: string;
  invitedByCode: string | null;
  invitedByType: "invite" | "none" | "referral";
  lastPaymentAt: string | null;
  ownReferralCode: string | null;
  subscriptionState: "active" | "expired" | "none" | "revoked";
  username: string;
};

type PaginationData = {
  from: number;
  to: number;
  total: number;
  totalPages: number;
};

type FiltersData = {
  page: number;
  perPage: 10 | 20 | 50;
  query: string;
  sort: UsersSort;
  subscription: SubscriptionFilter;
};

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getSubscriptionMeta(state: AdminUsersListItem["subscriptionState"]) {
  if (state === "active") {
    return { label: "Active", tone: "success" as const };
  }

  if (state === "expired") {
    return { label: "Expired", tone: "warning" as const };
  }

  if (state === "revoked") {
    return { label: "Revoked", tone: "default" as const };
  }

  return { label: "—", tone: "default" as const };
}

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

export function AdminUsersSection({
  filters,
  pagination,
  users,
}: {
  filters: FiltersData;
  pagination: PaginationData;
  users: AdminUsersListItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedUser, setSelectedUser] = useState<AdminUsersListItem | null>(null);
  const paginationItems = useMemo(
    () => buildPaginationItems(filters.page, pagination.totalPages),
    [filters.page, pagination.totalPages]
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

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("q") ?? "").trim();
    navigate({
      page: "1",
      q: query || undefined,
    });
  }

  function handleReset() {
    navigate({
      page: undefined,
      perPage: undefined,
      q: undefined,
      sort: undefined,
      subscription: undefined,
    });
  }

  return (
    <AdminSectionShell
      description="Users table with filters and pagination."
      eyebrow="USERS"
      id="users"
      title="Users"
    >
      <div className="space-y-3">
        <AdminSurface className="p-4 md:p-4">
          <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_260px_auto_auto]" onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                defaultValue={filters.query}
                name="q"
                placeholder="Search by username"
              />
            </div>

            <Select
              onValueChange={(value) =>
                navigate({
                  page: "1",
                  subscription: value === "all" ? undefined : value,
                })
              }
              value={filters.subscription}
            >
              <SelectTrigger>
                <SelectValue placeholder="Subscription state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subscriptions</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>

            <Select
              onValueChange={(value) =>
                navigate({
                  page: "1",
                  sort: value === "newest" ? undefined : value,
                })
              }
              value={filters.sort}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="credits_desc">Credits desc</SelectItem>
                <SelectItem value="last_payment_desc">Last payment desc</SelectItem>
                <SelectItem value="active_subscription_first">Active subscription first</SelectItem>
              </SelectContent>
            </Select>

            <Button className="px-4" radius="card" type="submit" variant="outline">
              Apply
            </Button>

            <Button className="px-4" onClick={handleReset} radius="card" type="button" variant="ghost">
              Reset
            </Button>
          </form>
        </AdminSurface>

        <AdminSurface className="overflow-hidden p-0">
          {users.length ? (
            <>
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
                    <TableRow className="border-border/70">
                      <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Username
                      </TableHead>
                      <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Subscription
                      </TableHead>
                      <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Devices
                      </TableHead>
                      <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Credits
                      </TableHead>
                      <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Invited By
                      </TableHead>
                      <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Own Referral Code
                      </TableHead>
                      <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Joined
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const subscriptionMeta = getSubscriptionMeta(user.subscriptionState);
                      const devicesLabel =
                        user.subscriptionState === "none" || user.devices === null
                          ? "—"
                          : `${user.devices}`;
                      const invitedByLabel = user.invitedByCode ?? "—";
                      const ownReferralCode = user.ownReferralCode ?? "—";

                      return (
                        <TableRow
                          className="cursor-pointer border-border/70 hover:bg-background/45"
                          key={user.id}
                          onClick={() => setSelectedUser(user)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedUser(user);
                            }
                          }}
                          tabIndex={0}
                        >
                          <TableCell className="px-6 py-4 font-medium">{user.username}</TableCell>
                          <TableCell className="px-6 py-4">
                            <AdminStatusPill label={subscriptionMeta.label} tone={subscriptionMeta.tone} />
                          </TableCell>
                          <TableCell className="px-6 py-4 text-muted-foreground">{devicesLabel}</TableCell>
                          <TableCell className="px-6 py-4 text-muted-foreground">{user.credits}</TableCell>
                          <TableCell className="px-6 py-4 text-muted-foreground">{invitedByLabel}</TableCell>
                          <TableCell className="px-6 py-4 text-muted-foreground">{ownReferralCode}</TableCell>
                          <TableCell className="px-6 py-4 text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 border-t border-border/70 p-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>Rows per page:</span>
                  <Select
                    onValueChange={(value) =>
                      navigate({
                        page: "1",
                        perPage: value === "10" ? undefined : value,
                      })
                    }
                    value={String(filters.perPage)}
                  >
                    <SelectTrigger className="h-9 w-[92px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>
                    Showing {pagination.from}-{pagination.to} of {pagination.total} users
                  </span>
                </div>

                <Pagination className="justify-center">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationLink
                        aria-label="Previous page"
                        className={filters.page <= 1 ? "pointer-events-none opacity-50" : undefined}
                        href={buildHref({
                          page: String(Math.max(1, filters.page - 1)),
                        })}
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
                            isActive={item === filters.page}
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
                          filters.page >= pagination.totalPages
                            ? "pointer-events-none opacity-50"
                            : undefined
                        }
                        href={buildHref({
                          page: String(Math.min(pagination.totalPages, filters.page + 1)),
                        })}
                      >
                        <ChevronRight className="size-4" />
                      </PaginationLink>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>

                <div className="hidden md:block" />
              </div>
            </>
          ) : (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground md:px-6">
              No users found with current filters.
            </div>
          )}
        </AdminSurface>
      </div>

      <Dialog onOpenChange={(open) => !open && setSelectedUser(null)} open={Boolean(selectedUser)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>User Details View</DialogTitle>
            <DialogDescription>
              Temporary placeholder UI for upcoming full user profile dialog.
            </DialogDescription>
          </DialogHeader>

          {selectedUser ? (
            <div className="space-y-4">
              <div className="rounded-card border border-border/70 bg-background/35 p-4">
                <p className="text-lg font-semibold">{selectedUser.username}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Joined: {formatDate(selectedUser.createdAt)}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-card border border-border/70 bg-background/35 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Subscription</p>
                  <p className="mt-2 text-sm">
                    {getSubscriptionMeta(selectedUser.subscriptionState).label}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Devices: {selectedUser.devices ?? "—"}
                  </p>
                </div>

                <div className="rounded-card border border-border/70 bg-background/35 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Balance & codes</p>
                  <p className="mt-2 text-sm">Credits: {selectedUser.credits}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Invited by: {selectedUser.invitedByCode ?? "—"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Referral code: {selectedUser.ownReferralCode ?? "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-card border border-dashed border-border/70 bg-background/20 p-4 text-sm text-muted-foreground">
                Payments timeline placeholder. Last payment: {formatDateTime(selectedUser.lastPaymentAt)}.
              </div>

              <div className="rounded-card border border-dashed border-border/70 bg-background/20 p-4 text-sm text-muted-foreground">
                Tickets / audit / device management placeholder.
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setSelectedUser(null)} radius="card" type="button" variant="outline">
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminSectionShell>
  );
}
