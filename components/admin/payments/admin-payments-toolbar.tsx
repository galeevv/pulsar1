"use client";

import type { FormEvent } from "react";
import { Search } from "lucide-react";

import {
  type AdminPaymentMethodFilter,
  type AdminPaymentsFilters,
  type AdminPaymentsPageSize,
  type AdminPaymentsSort,
  type AdminPaymentStatusFilter,
} from "@/lib/admin/admin-payments-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AdminPaymentsToolbar({
  filters,
  onMethodChange,
  onPageSizeChange,
  onQuerySubmit,
  onReset,
  onSortChange,
  onStatusChange,
}: {
  filters: Pick<AdminPaymentsFilters, "method" | "pageSize" | "query" | "sort" | "status">;
  onMethodChange: (value: AdminPaymentMethodFilter) => void;
  onPageSizeChange: (value: AdminPaymentsPageSize) => void;
  onQuerySubmit: (value: string) => void;
  onReset: () => void;
  onSortChange: (value: AdminPaymentsSort) => void;
  onStatusChange: (value: AdminPaymentStatusFilter) => void;
}) {
  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("query") ?? "").trim();
    onQuerySubmit(query);
  }

  return (
    <form
      className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_170px_170px_170px_140px_auto_auto]"
      onSubmit={handleSearchSubmit}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          defaultValue={filters.query}
          name="query"
          placeholder="Search by user, payment ID, or external ID"
        />
      </div>

      <Select
        onValueChange={(value) => onStatusChange(value as AdminPaymentStatusFilter)}
        value={filters.status}
      >
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>

      <Select
        onValueChange={(value) => onMethodChange(value as AdminPaymentMethodFilter)}
        value={filters.method}
      >
        <SelectTrigger>
          <SelectValue placeholder="Method" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All methods</SelectItem>
          <SelectItem value="platega">Platega</SelectItem>
          <SelectItem value="credits">Credits</SelectItem>
        </SelectContent>
      </Select>

      <Select
        onValueChange={(value) => onSortChange(value as AdminPaymentsSort)}
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
        onValueChange={(value) => onPageSizeChange(Number(value) as AdminPaymentsPageSize)}
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
