"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminPaymentRow } from "@/lib/admin/admin-payments-types";

import {
  formatPaymentDateTime,
  formatRub,
  getPaymentMethodLabel,
  getPaymentMethodVariant,
  getPaymentStatusLabel,
  getPaymentStatusVariant,
  getSubscriptionOutcomeLabel,
  getSubscriptionOutcomeVariant,
} from "./admin-payments-presenters";

export function AdminPaymentsMobileList({
  onViewDetails,
  rows,
}: {
  onViewDetails: (paymentId: string) => void;
  rows: AdminPaymentRow[];
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
              <p className="truncate font-mono text-xs text-foreground">{row.id}</p>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {row.username ?? "Unknown user"}
              </p>
            </div>
            <Badge variant={getPaymentStatusVariant(row.status)}>
              {getPaymentStatusLabel(row.status)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Amount</p>
              <p className="mt-1 font-semibold text-foreground">{formatRub(row.amountRub)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Method</p>
              <div className="mt-1">
                <Badge variant={getPaymentMethodVariant(row.method)}>
                  {getPaymentMethodLabel(row.method)}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Subscription</p>
              <div className="mt-1">
                <Badge variant={getSubscriptionOutcomeVariant(row.subscriptionOutcome)}>
                  {getSubscriptionOutcomeLabel(row.subscriptionOutcome)}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Created</p>
              <p className="mt-1 text-muted-foreground">{formatPaymentDateTime(row.createdAt)}</p>
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
