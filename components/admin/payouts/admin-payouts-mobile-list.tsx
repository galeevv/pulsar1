"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminPayoutRow } from "@/lib/admin/admin-payouts-types";

import {
  formatPayoutDateTime,
  formatRub,
  getPayoutStatusLabel,
  getPayoutStatusVariant,
} from "./admin-payouts-presenters";

function resolvePayoutBank(row: AdminPayoutRow) {
  const raw = row.details.payoutDetailsSnapshot?.trim() ?? "";
  if (!raw) {
    return "—";
  }

  const matched = raw.match(/Банк:\s*(.+)/i);
  return matched?.[1]?.trim() || "—";
}

export function AdminPayoutsMobileList({
  onViewDetails,
  rows,
}: {
  onViewDetails: (requestId: string) => void;
  rows: AdminPayoutRow[];
}) {
  return (
    <div className="space-y-3 p-3 md:hidden">
      {rows.map((row) => (
        <div
          className="space-y-3 rounded-card border border-border/70 bg-background/35 p-3"
          key={row.id}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {row.username ?? "Unknown user"}
              </p>
            </div>
            <Badge variant={getPayoutStatusVariant(row.status)}>
              {getPayoutStatusLabel(row.status)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Amount</p>
              <p className="mt-1 font-semibold text-foreground">{formatRub(row.amountRub)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Bank</p>
              <p className="mt-1 text-muted-foreground">{resolvePayoutBank(row)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Requested</p>
              <p className="mt-1 text-muted-foreground">{formatPayoutDateTime(row.createdAt)}</p>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => onViewDetails(row.id)}
            radius="card"
            type="button"
            variant="outline"
          >
            View details
          </Button>
        </div>
      ))}
    </div>
  );
}
