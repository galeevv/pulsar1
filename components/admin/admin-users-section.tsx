"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import {
  grantUserCreditsAction,
  resetUserPasswordAction,
  syncUserSubscriptionAction,
} from "@/app/admin/users/actions";
import { AdminSectionShell } from "@/components/admin/admin-section-shell";
import { AdminStatusPill } from "@/components/admin/admin-status-pill";
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
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SubscriptionFilter = "all" | "active" | "expired" | "none";
type UsersSort =
  | "newest";

export type AdminUsersListItem = {
  createdAt: string;
  credits: number;
  devices: number | null;
  id: string;
  invitedCount: number;
  invitedByCode: string | null;
  invitedByType: "none" | "referral";
  lastPaymentAt: string | null;
  ownReferralCode: string | null;
  payments: Array<{
    amountRub: number;
    date: string;
    method: "CREDITS" | "PLATEGA";
    status: "APPROVED" | "CREATED" | "REJECTED";
    tariff: string;
  }>;
  subscriptionEndsAt: string | null;
  subscriptionState: "active" | "expired" | "none";
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
  perPage: 10;
  query: string;
  sort: UsersSort;
  subscription: SubscriptionFilter;
};

type UserActionState = {
  message: string;
  nonce: number;
  status: "error" | "idle" | "success";
};

const ACTION_INITIAL_STATE: UserActionState = {
  message: "",
  nonce: 0,
  status: "idle",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleString("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatRub(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

function getSubscriptionMeta(state: AdminUsersListItem["subscriptionState"]) {
  if (state === "active") {
    return { label: "Active", tone: "success" as const };
  }

  if (state === "expired") {
    return { label: "Expired", tone: "warning" as const };
  }

  return { label: "None", tone: "default" as const };
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

function useActionToast(state: UserActionState, formRef: React.RefObject<HTMLFormElement | null>) {
  const handledNonceRef = useRef(0);

  useEffect(() => {
    if (state.nonce === 0 || state.nonce === handledNonceRef.current) {
      return;
    }

    handledNonceRef.current = state.nonce;

    if (state.status === "success") {
      toast.success(state.message, { position: "bottom-right" });
      formRef.current?.reset();
      return;
    }

    if (state.status === "error") {
      toast.error(state.message, { position: "bottom-right" });
    }
  }, [formRef, state]);
}

function UserPasswordResetForm({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    resetUserPasswordAction,
    ACTION_INITIAL_STATE
  );
  useActionToast(state, formRef);

  return (
    <form action={formAction} className="flex flex-col gap-3" ref={formRef}>
      <input name="userId" type="hidden" value={userId} />
      <label className="flex flex-col gap-2 text-sm font-medium" htmlFor={`user-reset-password-${userId}`}>
        New password for {username}
        <Input
          autoComplete="new-password"
          id={`user-reset-password-${userId}`}
          name="nextPassword"
          placeholder="New password"
          required
          type="password"
        />
      </label>
      <Button className="h-input w-full sm:w-auto" disabled={isPending} radius="card" type="submit">
        {isPending ? "Updating..." : "Change password"}
      </Button>
    </form>
  );
}

function GrantCreditsForm({ userId }: { userId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    grantUserCreditsAction,
    ACTION_INITIAL_STATE
  );
  useActionToast(state, formRef);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-center" ref={formRef}>
      <input name="userId" type="hidden" value={userId} />
      <Input min={1} name="amountCredits" placeholder="Credits amount" required type="number" />
      <Button className="h-input w-full sm:w-auto" disabled={isPending} radius="card" type="submit">
        {isPending ? "Issuing..." : "Issue credits"}
      </Button>
    </form>
  );
}

function SyncUserSubscriptionForm({ userId }: { userId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    syncUserSubscriptionAction,
    ACTION_INITIAL_STATE
  );
  useActionToast(state, formRef);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-center" ref={formRef}>
      <input name="userId" type="hidden" value={userId} />
      <Button className="h-input w-full px-button-x sm:w-auto" disabled={isPending} radius="card" type="submit" variant="outline">
        <RefreshCw className={isPending ? "animate-spin" : undefined} />
        {isPending ? "Syncing..." : "Sync subscription"}
      </Button>
    </form>
  );
}

function DetailBlock({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-card border border-border/70 bg-background/35 p-4">
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Separator className="flex-1" />
      </div>
      {children}
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-foreground">{value}</span>
    </div>
  );
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
    navigate({ page: "1", q: query || undefined });
  }

  return (
    <AdminSectionShell description="" eyebrow="USERS" id="users" title="">
      <div className="space-y-3">
        <AdminSurface className="p-4 md:p-4">
          <form className="grid items-center gap-3 lg:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" defaultValue={filters.query} name="q" placeholder="Search by username" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["all", "active", "expired", "none"] as const).map((value) => (
                <Button
                  className="h-input px-button-x"
                  key={value}
                  onClick={() => navigate({ page: "1", subscription: value === "all" ? undefined : value })}
                  radius="card"
                  type="button"
                  variant={filters.subscription === value ? "default" : "outline"}
                >
                  {value[0].toUpperCase() + value.slice(1)}
                </Button>
              ))}
            </div>
          </form>
        </AdminSurface>

        <AdminSurface className="overflow-hidden p-0">
          {users.length ? (
            <>
              <div className="space-y-3 p-3 md:hidden">
                {users.map((user) => {
                  const subscriptionMeta = getSubscriptionMeta(user.subscriptionState);

                  return (
                    <button
                      className="block w-full rounded-card border border-border/70 bg-background/35 p-3 text-left"
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{user.username}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Joined {formatDate(user.createdAt)}</p>
                        </div>
                        <AdminStatusPill label={subscriptionMeta.label} tone={subscriptionMeta.tone} />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Devices</p>
                          <p className="mt-1 text-foreground">{user.devices ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Credits</p>
                          <p className="mt-1 text-foreground">{user.credits}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Invited By</p>
                          <p className="mt-1 truncate text-muted-foreground">{user.invitedByCode ?? "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Referral</p>
                          <p className="mt-1 truncate text-muted-foreground">{user.ownReferralCode ?? "-"}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="hidden max-h-[600px] overflow-auto md:block">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
                    <TableRow className="border-border/70">
                      <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Username</TableHead>
                      <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Subscription</TableHead>
                      <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Devices</TableHead>
                      <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Credits</TableHead>
                      <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Invited By</TableHead>
                      <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Referral Code</TableHead>
                      <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const subscriptionMeta = getSubscriptionMeta(user.subscriptionState);

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
                          <TableCell className="px-6 py-4 text-muted-foreground">{user.devices ?? "-"}</TableCell>
                          <TableCell className="px-6 py-4 text-muted-foreground">{user.credits}</TableCell>
                          <TableCell className="px-6 py-4 text-muted-foreground">{user.invitedByCode ?? "-"}</TableCell>
                          <TableCell className="px-6 py-4 text-muted-foreground">{user.ownReferralCode ?? "-"}</TableCell>
                          <TableCell className="px-6 py-4 text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 border-t border-border/70 p-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>Showing {pagination.from}-{pagination.to} of {pagination.total} users</span>
                </div>

                <Pagination className="justify-center">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationLink
                        aria-label="Previous page"
                        className={filters.page <= 1 ? "pointer-events-none opacity-50" : undefined}
                        href={buildHref({ page: String(Math.max(1, filters.page - 1)) })}
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
                          <PaginationLink href={buildHref({ page: String(item) })} isActive={item === filters.page}>
                            {item}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}

                    <PaginationItem>
                      <PaginationLink
                        aria-label="Next page"
                        className={filters.page >= pagination.totalPages ? "pointer-events-none opacity-50" : undefined}
                        href={buildHref({ page: String(Math.min(pagination.totalPages, filters.page + 1)) })}
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

      <Sheet onOpenChange={(open) => !open && setSelectedUser(null)} open={Boolean(selectedUser)}>
        <SheetContent className="w-full overflow-y-auto p-4 sm:max-w-3xl sm:p-6 lg:max-w-4xl">
          <SheetHeader className="p-0 text-left">
            <SheetTitle>User details</SheetTitle>
            <SheetDescription className="sr-only">User details</SheetDescription>
          </SheetHeader>

          {selectedUser ? (
            <div className="mt-4 space-y-4">
              <DetailBlock title="User">
                <div className="space-y-2">
                  <KeyValue label="Username" value={<span className="font-medium">{selectedUser.username}</span>} />
                  <KeyValue label="Joined" value={formatDateTime(selectedUser.createdAt)} />
                </div>
              </DetailBlock>

              <DetailBlock title="Subscription">
                <div className="space-y-2">
                  <KeyValue
                    label="Status"
                    value={<Badge variant="secondary">{getSubscriptionMeta(selectedUser.subscriptionState).label}</Badge>}
                  />
                  <KeyValue label="Active until" value={formatDateTime(selectedUser.subscriptionEndsAt)} />
                  <KeyValue label="Devices" value={selectedUser.devices ?? "-"} />
                </div>
              </DetailBlock>

              <DetailBlock title="Payments">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Tariff</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUser.payments.length > 0 ? (
                        selectedUser.payments.map((payment, index) => (
                          <TableRow key={`${payment.date}-${index}`}>
                            <TableCell>{formatDate(payment.date)}</TableCell>
                            <TableCell className="min-w-[180px]">{payment.tariff}</TableCell>
                            <TableCell>{formatRub(payment.amountRub)}</TableCell>
                            <TableCell>{payment.method}</TableCell>
                            <TableCell>{payment.status}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell className="text-muted-foreground" colSpan={5}>
                            No payments yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </DetailBlock>

              <DetailBlock title="Balance & Codes">
                <div className="space-y-2">
                  <KeyValue label="Credits" value={selectedUser.credits} />
                  <KeyValue label="Invited by" value={selectedUser.invitedByCode ?? "-"} />
                  <KeyValue label="Referral code" value={selectedUser.ownReferralCode ?? "-"} />
                  <KeyValue label="Invited" value={selectedUser.invitedCount} />
                </div>
              </DetailBlock>

              <DetailBlock title="Actions">
                <div className="space-y-4">
                  <SyncUserSubscriptionForm userId={selectedUser.id} />
                  <Separator />
                  <UserPasswordResetForm userId={selectedUser.id} username={selectedUser.username} />
                  <Separator />
                  <GrantCreditsForm userId={selectedUser.id} />
                </div>
              </DetailBlock>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </AdminSectionShell>
  );
}
