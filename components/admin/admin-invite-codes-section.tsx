"use client";

import { useMemo, useState } from "react";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { createInviteCodeAction, toggleInviteCodeAction } from "@/app/admin/actions";
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

type InviteCodeItem = {
  code: string;
  createdAt: Date;
  expiresAt: Date | null;
  id: string;
  isEnabled: boolean;
  usedAt: Date | null;
  usedBy: { username: string } | null;
};

function formatDate(value: Date | null) {
  if (!value) {
    return "No expiration";
  }

  return value.toLocaleString("ru-RU");
}

function formatDateOnly(value: Date | null) {
  if (!value) {
    return "No expiration";
  }

  return value.toLocaleDateString("ru-RU");
}

function getUsageState(item: Pick<InviteCodeItem, "usedAt" | "usedBy">) {
  return item.usedAt || item.usedBy ? "used" : "unused";
}

function getStatusMeta(isEnabled: boolean) {
  return isEnabled
    ? { label: "Active", tone: "success" as const }
    : { label: "Disabled", tone: "default" as const };
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

export function AdminInviteCodesSection({
  inviteCodes,
  embedded = false,
}: {
  inviteCodes: InviteCodeItem[];
  embedded?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [usageFilter, setUsageFilter] = useState<"all" | "used" | "unused">("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<10 | 20 | 50>(10);
  const [selectedCode, setSelectedCode] = useState<InviteCodeItem | null>(null);

  const filteredCodes = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return inviteCodes
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
        if (usageFilter === "all") {
          return true;
        }

        return getUsageState(item) === usageFilter;
      })
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }, [inviteCodes, searchQuery, statusFilter, usageFilter]);

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
    setUsageFilter("all");
    setPage(1);
  }

  const content = (
    <div className="space-y-4">
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <AdminSurface className="p-4 md:p-4">
          <form action={createInviteCodeAction} className="space-y-4">
            <input name="redirectPath" type="hidden" value="/admin/codes?tab=invite" />

            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Create Invite Code</h3>
              <p className="text-sm text-muted-foreground">
                Leave the field empty for automatic generation, or define custom code manually.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="invite-code-value">
                Code
              </label>
              <Input id="invite-code-value" name="code" placeholder="Leave empty for auto generation" />
            </div>

            <AdminDatePickerField label="Expiration date" name="expiresAt" />

            <Button className="w-full" radius="card" type="submit">
              Create invite code
            </Button>
          </form>
        </AdminSurface>

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
                onValueChange={(value: "all" | "used" | "unused") => {
                  setUsageFilter(value);
                  setPage(1);
                }}
                value={usageFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Usage filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Usage: all</SelectItem>
                  <SelectItem value="used">Usage: used</SelectItem>
                  <SelectItem value="unused">Usage: unused</SelectItem>
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
                        <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Status</TableHead>
                        <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Usage</TableHead>
                        <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Used by</TableHead>
                        <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Expires</TableHead>
                        <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCodes.map((item) => {
                        const status = getStatusMeta(item.isEnabled);
                        const usageState = getUsageState(item);

                        return (
                          <TableRow
                            className="cursor-pointer border-border/70 hover:bg-background/45"
                            key={item.id}
                            onClick={() => setSelectedCode(item)}
                          >
                            <TableCell className="px-6 py-4 font-medium">{item.code}</TableCell>
                            <TableCell className="px-6 py-4">
                              <AdminStatusPill label={status.label} tone={status.tone} />
                            </TableCell>
                            <TableCell className="px-6 py-4 text-muted-foreground">
                              {usageState === "used" ? "Used" : "Unused"}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-muted-foreground">
                              {item.usedBy?.username ?? "--"}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-muted-foreground">{formatDateOnly(item.expiresAt)}</TableCell>
                            <TableCell className="px-6 py-4 text-muted-foreground">{formatDateOnly(item.createdAt)}</TableCell>
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
                      Showing {from}-{to} of {total} invite codes
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
                No invite codes found with current filters.
              </div>
            )}
          </AdminSurface>
        </div>
      </div>

      <Dialog onOpenChange={(open) => !open && setSelectedCode(null)} open={Boolean(selectedCode)}>
        <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invite Code Details</DialogTitle>
            <DialogDescription>
              Placeholder detail view. Final version can include invite redemption history and admin audit events.
            </DialogDescription>
          </DialogHeader>

          {selectedCode ? (
            <div className="space-y-4">
              <div className="rounded-card border border-border/70 bg-background/35 p-4">
                <p className="text-lg font-semibold">{selectedCode.code}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Used by: {selectedCode.usedBy?.username ?? "Not used yet"}
                </p>
              </div>

              <AdminCopyCodeButton value={selectedCode.code} />

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-card border border-border/70 bg-background/35 p-4 text-sm">
                  <p>Status: {selectedCode.isEnabled ? "Active" : "Disabled"}</p>
                  <p className="mt-2 text-muted-foreground">
                    Usage: {getUsageState(selectedCode) === "used" ? "Used" : "Unused"}
                  </p>
                  <p className="mt-2 text-muted-foreground">Created: {formatDate(selectedCode.createdAt)}</p>
                </div>
                <div className="rounded-card border border-border/70 bg-background/35 p-4 text-sm">
                  <p>Expires: {formatDate(selectedCode.expiresAt)}</p>
                  <p className="mt-2 text-muted-foreground">
                    Used at: {selectedCode.usedAt ? formatDate(selectedCode.usedAt) : "Not used"}
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    Used by username: {selectedCode.usedBy?.username ?? "--"}
                  </p>
                </div>
              </div>

              <form action={toggleInviteCodeAction}>
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
                Placeholder: invite source, conversion attribution, manual revoke actions.
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <AdminSectionShell id="invite-codes" title="Invite Codes">
      {content}
    </AdminSectionShell>
  );
}
