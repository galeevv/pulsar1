"use client";

import { useMemo, useState } from "react";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import {
  createReferralCodeAction,
  toggleReferralCodeAction,
  updateReferralProgramSettingsAction,
} from "@/app/admin/actions";
import { AdminDatePickerField } from "@/components/admin/admin-date-picker-field";
import { AdminStatusPill } from "@/components/admin/admin-status-pill";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { AdminSectionShell } from "./admin-section-shell";
import { AdminCopyCodeButton } from "./admin-copy-code-button";

type ReferralCodeItem = {
  _count: { uses: number };
  code: string;
  createdAt: Date;
  discountPct: number;
  expiresAt: Date | null;
  id: string;
  isEnabled: boolean;
  ownerUser: { username: string } | null;
  rewardCredits: number;
};

type ReferralProgramSettings = {
  defaultDiscountPct: number;
  defaultRewardCredits: number;
  isEnabled: boolean;
  minimumPayoutCredits: number;
};

function formatDate(value: Date | null) {
  if (!value) {
    return "No expiration";
  }

  return value.toLocaleString("ru-RU");
}

function formatDateOnly(value: Date) {
  return value.toLocaleDateString("ru-RU");
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

function getStatusMeta(isEnabled: boolean) {
  return isEnabled
    ? { label: "Active", tone: "success" as const }
    : { label: "Disabled", tone: "default" as const };
}

export function AdminReferralCodesSection({
  referralCodes,
  referralProgramSettings,
  embedded = false,
}: {
  referralCodes: ReferralCodeItem[];
  referralProgramSettings: ReferralProgramSettings;
  embedded?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [hasInvitesFilter, setHasInvitesFilter] = useState<"all" | "yes" | "no">("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<10 | 20 | 50>(10);
  const [selectedCode, setSelectedCode] = useState<ReferralCodeItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsEnabled, setSettingsEnabled] = useState(referralProgramSettings.isEnabled);

  const filteredCodes = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return referralCodes
      .filter((item) =>
        normalizedSearch ? item.code.toLowerCase().includes(normalizedSearch) : true
      )
      .filter((item) => {
        if (statusFilter === "all") {
          return true;
        }

        if (statusFilter === "active") {
          return item.isEnabled;
        }

        return !item.isEnabled;
      })
      .filter((item) => {
        if (hasInvitesFilter === "all") {
          return true;
        }

        if (hasInvitesFilter === "yes") {
          return item._count.uses > 0;
        }

        return item._count.uses === 0;
      })
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }, [hasInvitesFilter, referralCodes, searchQuery, statusFilter]);

  const total = filteredCodes.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = total === 0 ? 0 : Math.min(safePage * perPage, total);
  const paginatedCodes = filteredCodes.slice((safePage - 1) * perPage, safePage * perPage);
  const paginationItems = buildPaginationItems(safePage, totalPages);

  function resetFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setHasInvitesFilter("all");
    setPage(1);
  }

  const content = (
    <div className="space-y-4">
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="space-y-3">
          <AdminSurface className="p-4 md:p-4">
            <div className="space-y-3">
              <form action={createReferralCodeAction} className="space-y-4">
                <input name="redirectPath" type="hidden" value="/admin/codes?tab=referral" />

                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Create Referral Code</h3>
                  <p className="text-sm text-muted-foreground">
                    Reusable rewards-based code for invited users.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium" htmlFor="referral-code-value">
                    Code
                  </label>
                  <Input id="referral-code-value" name="code" placeholder="Leave empty for auto generation" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium" htmlFor="referral-code-discount">
                      Discount (%)
                    </label>
                    <Input
                      defaultValue={referralProgramSettings.defaultDiscountPct}
                      id="referral-code-discount"
                      max="100"
                      min="1"
                      name="discountPct"
                      required
                      type="number"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium" htmlFor="referral-code-reward">
                      Reward credits
                    </label>
                    <Input
                      defaultValue={referralProgramSettings.defaultRewardCredits}
                      id="referral-code-reward"
                      min="1"
                      name="rewardCredits"
                      required
                      type="number"
                    />
                  </div>
                </div>

                <AdminDatePickerField label="Expiration date" name="expiresAt" />

                <Button className="w-full" radius="card" type="submit">
                  Create referral code
                </Button>
              </form>

              <Button
                className="w-full"
                onClick={() => setIsSettingsOpen(true)}
                radius="card"
                type="button"
                variant="outline"
              >
                Referral Program Settings
              </Button>
            </div>
          </AdminSurface>
        </div>

        <div className="space-y-3">
          <AdminSurface className="p-4 md:p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by code"
                  value={searchQuery}
                />
              </div>
              <Select
                onValueChange={(value: "all" | "active" | "disabled") => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                value={statusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>

              <Select
                onValueChange={(value: "all" | "yes" | "no") => {
                  setHasInvitesFilter(value);
                  setPage(1);
                }}
                value={hasInvitesFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Has invites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Has invites: all</SelectItem>
                  <SelectItem value="yes">Has invites: yes</SelectItem>
                  <SelectItem value="no">Has invites: no</SelectItem>
                </SelectContent>
              </Select>

              <Button className="px-4" onClick={resetFilters} radius="card" type="button" variant="ghost">
                Reset
              </Button>
            </div>
          </AdminSurface>

          <AdminSurface className="overflow-hidden p-0">
            {paginatedCodes.length ? (
              <>
                <div className="max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
                      <TableRow className="border-border/70">
                        <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Code</TableHead>
                        <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Owner</TableHead>
                        <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Status</TableHead>
                        <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Invites</TableHead>
                        <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCodes.map((item) => {
                        const status = getStatusMeta(item.isEnabled);

                        return (
                          <TableRow
                            className="cursor-pointer border-border/70 hover:bg-background/45"
                            key={item.id}
                            onClick={() => setSelectedCode(item)}
                          >
                            <TableCell className="px-6 py-4 font-medium">{item.code}</TableCell>
                            <TableCell className="px-6 py-4 text-muted-foreground">
                              {item.ownerUser?.username ?? "ADMIN"}
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <AdminStatusPill label={status.label} tone={status.tone} />
                            </TableCell>
                            <TableCell className="px-6 py-4 text-muted-foreground">{item._count.uses}</TableCell>
                            <TableCell className="px-6 py-4 text-muted-foreground">
                              {formatDateOnly(item.createdAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-3 border-t border-border/70 p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-center">
                  <div className="min-w-0 space-y-2 text-sm text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>Rows per page:</span>
                      <Select
                        onValueChange={(value: "10" | "20" | "50") => {
                          setPerPage(value === "50" ? 50 : value === "20" ? 20 : 10);
                          setPage(1);
                        }}
                        value={String(perPage)}
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
                    </div>
                    <p className="break-words">
                      Showing {from}-{to} of {total} referral codes
                    </p>
                  </div>

                  <Pagination className="justify-start md:justify-end">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationLink
                          aria-label="Previous page"
                          className={safePage <= 1 ? "pointer-events-none opacity-50" : undefined}
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            if (safePage > 1) {
                              setPage(safePage - 1);
                            }
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
                              href="#"
                              isActive={item === safePage}
                              onClick={(event) => {
                                event.preventDefault();
                                setPage(item);
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
                          className={safePage >= totalPages ? "pointer-events-none opacity-50" : undefined}
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            if (safePage < totalPages) {
                              setPage(safePage + 1);
                            }
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
              <div className="px-4 py-12 text-center text-sm text-muted-foreground md:px-6">
                No referral codes found with current filters.
              </div>
            )}
          </AdminSurface>
        </div>
      </div>

      <Dialog onOpenChange={(open) => !open && setSelectedCode(null)} open={Boolean(selectedCode)}>
        <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Referral Code Details</DialogTitle>
            <DialogDescription>
              Placeholder detail view. Final version can include reward timeline, owner actions and invite drill-down.
            </DialogDescription>
          </DialogHeader>

          {selectedCode ? (
            <div className="space-y-4">
              <div className="rounded-card border border-border/70 bg-background/35 p-4">
                <p className="text-lg font-semibold">{selectedCode.code}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Owner: {selectedCode.ownerUser?.username ?? "ADMIN"}
                </p>
              </div>

              <AdminCopyCodeButton value={selectedCode.code} />

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-card border border-border/70 bg-background/35 p-4 text-sm">
                  <p>Status: {selectedCode.isEnabled ? "Active" : "Disabled"}</p>
                  <p className="mt-2 text-muted-foreground">Invites: {selectedCode._count.uses}</p>
                  <p className="mt-2 text-muted-foreground">
                    Created: {formatDate(selectedCode.createdAt)}
                  </p>
                </div>
                <div className="rounded-card border border-border/70 bg-background/35 p-4 text-sm">
                  <p>Discount: {selectedCode.discountPct}%</p>
                  <p className="mt-2 text-muted-foreground">Reward: {selectedCode.rewardCredits} credits</p>
                  <p className="mt-2 text-muted-foreground">Expires: {formatDate(selectedCode.expiresAt)}</p>
                </div>
              </div>

              <form action={toggleReferralCodeAction}>
                <input name="id" type="hidden" value={selectedCode.id} />
                <input
                  name="nextEnabled"
                  type="hidden"
                  value={selectedCode.isEnabled ? "false" : "true"}
                />
                <Button radius="card" type="submit" variant="outline">
                  {selectedCode.isEnabled ? "Disable code" : "Enable code"}
                </Button>
              </form>

              <div className="rounded-card border border-dashed border-border/70 bg-background/20 p-4 text-sm text-muted-foreground">
                Placeholder: referral invite list / reward events / manual actions.
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setIsSettingsOpen} open={isSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Referral Program Settings</DialogTitle>
            <DialogDescription>
              Global defaults for user-generated referral codes.
            </DialogDescription>
          </DialogHeader>

          <form action={updateReferralProgramSettingsAction} className="space-y-4">
            <input name="isEnabled" type="hidden" value={settingsEnabled ? "on" : "off"} />

            <div className="flex items-center justify-between gap-3 rounded-card border border-border/70 bg-background/40 p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Referral system</p>
                <p className="text-xs text-muted-foreground">Global on/off switch.</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={settingsEnabled} id="referral-system-enabled" onCheckedChange={setSettingsEnabled} />
                <label className="text-sm font-medium" htmlFor="referral-system-enabled">
                  Enabled
                </label>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium" htmlFor="referral-default-discount">
                  New user discount (%)
                </label>
                <Input
                  defaultValue={referralProgramSettings.defaultDiscountPct}
                  id="referral-default-discount"
                  max="100"
                  min="1"
                  name="defaultDiscountPct"
                  required
                  type="number"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium" htmlFor="referral-default-reward">
                  Referrer reward (credits)
                </label>
                <Input
                  defaultValue={referralProgramSettings.defaultRewardCredits}
                  id="referral-default-reward"
                  min="1"
                  name="defaultRewardCredits"
                  required
                  type="number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="referral-minimum-payout">
                Minimum payout (credits)
              </label>
              <Input
                defaultValue={referralProgramSettings.minimumPayoutCredits}
                id="referral-minimum-payout"
                min="1"
                name="minimumPayoutCredits"
                required
                type="number"
              />
            </div>

            <Button className="w-full" radius="card" type="submit">
              Save settings
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <AdminSectionShell
      description="Referral code management."
      eyebrow="REFERRAL"
      id="referral-codes"
      title="Referral Codes"
    >
      {content}
    </AdminSectionShell>
  );
}
