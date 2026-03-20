"use client";

import Link from "next/link";

import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminPaymentRow } from "@/lib/admin/admin-payments-types";

import {
  formatNullableText,
  formatPaymentDateTime,
  formatRub,
  getPaymentMethodLabel,
  getPaymentMethodVariant,
  getPaymentStatusLabel,
  getPaymentStatusVariant,
  getSubscriptionOutcomeLabel,
  getSubscriptionOutcomeVariant,
} from "./admin-payments-presenters";

export function AdminPaymentsTable({
  onViewDetails,
  rows,
}: {
  onViewDetails: (paymentId: string) => void;
  rows: AdminPaymentRow[];
}) {
  return (
    <div className="hidden md:block">
      <div className="max-h-[620px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
            <TableRow className="border-border/70">
              <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Payment
              </TableHead>
              <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                User
              </TableHead>
              <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Method
              </TableHead>
              <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Amount
              </TableHead>
              <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Subscription
              </TableHead>
              <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Created
              </TableHead>
              <TableHead className="h-12 px-6 text-right text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const userHref = `/admin/users?q=${encodeURIComponent(row.username ?? row.userId)}`;

              return (
                <TableRow className="border-border/70 hover:bg-background/45" key={row.id}>
                  <TableCell className="px-6 py-4">
                    <p className="font-mono text-xs text-foreground">{row.id}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatNullableText(row.externalPaymentId)}
                    </p>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Link
                      className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
                      href={userHref}
                    >
                      {row.username ?? "Unknown user"}
                      <ArrowUpRight className="size-3.5 text-muted-foreground" />
                    </Link>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{row.userId}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant={getPaymentStatusVariant(row.status)}>
                      {getPaymentStatusLabel(row.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant={getPaymentMethodVariant(row.method)}>
                      {getPaymentMethodLabel(row.method)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-semibold text-foreground">
                    {formatRub(row.amountRub)}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant={getSubscriptionOutcomeVariant(row.subscriptionOutcome)}>
                      {getSubscriptionOutcomeLabel(row.subscriptionOutcome)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                    {formatPaymentDateTime(row.createdAt)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <Button
                      onClick={() => onViewDetails(row.id)}
                      radius="card"
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
