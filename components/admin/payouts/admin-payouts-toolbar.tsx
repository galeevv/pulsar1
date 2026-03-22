"use client";

import type { FormEvent } from "react";
import { Search } from "lucide-react";

import type {
  AdminPayoutPageSize,
  AdminPayoutSort,
  AdminPayoutStatusFilter,
  AdminPayoutsFilters,
} from "@/lib/admin/admin-payouts-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AdminPayoutsToolbar({
  filters,
  onPageSizeChange,
  onQuerySubmit,
  onReset,
  onSortChange,
  onStatusChange,
}: {
  filters: Pick<AdminPayoutsFilters, "pageSize" | "query" | "sort" | "status">;
  onPageSizeChange: (value: AdminPayoutPageSize) => void;
  onQuerySubmit: (value: string) => void;
  onReset: () => void;
  onSortChange: (value: AdminPayoutSort) => void;
  onStatusChange: (value: AdminPayoutStatusFilter) => void;
}) {
  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("query") ?? "").trim();
    onQuerySubmit(query);
  }

  return (
    <form
      className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_160px_auto_auto]"
      onSubmit={handleSearchSubmit}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          defaultValue={filters.query}
          name="query"
          placeholder="Search by username"
        />
      </div>

      <Select
        onValueChange={(value) => onStatusChange(value as AdminPayoutStatusFilter)}
        value={filters.status}
      >
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="canceled">Canceled</SelectItem>
        </SelectContent>
      </Select>

      <Select
        onValueChange={(value) => onSortChange(value as AdminPayoutSort)}
        value={filters.sort}
      >
        <SelectTrigger>
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
          <SelectItem value="amount_desc">Amount desc</SelectItem>
          <SelectItem value="amount_asc">Amount asc</SelectItem>
        </SelectContent>
      </Select>

      <Select
        onValueChange={(value) => onPageSizeChange(Number(value) as AdminPayoutPageSize)}
        value={String(filters.pageSize)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Rows" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="20">20</SelectItem>
          <SelectItem value="50">50</SelectItem>
          <SelectItem value="100">100</SelectItem>
        </SelectContent>
      </Select>

      <Button radius="card" type="submit" variant="outline">
        Apply
      </Button>

      <Button onClick={onReset} radius="card" type="button" variant="ghost">
        Reset
      </Button>
    </form>
  );
}
