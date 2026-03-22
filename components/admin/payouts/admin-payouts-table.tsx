"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export function AdminPayoutsTable({
  onViewDetails,
  rows,
}: {
  onViewDetails: (requestId: string) => void;
  rows: AdminPayoutRow[];
}) {
  return (
    <div className="hidden md:block">
      <div className="max-h-[620px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
            <TableRow className="border-border/70">
              <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Username
              </TableHead>
              <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Amount
              </TableHead>
              <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Bank
              </TableHead>
              <TableHead className="h-12 px-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Requested
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                className="cursor-pointer border-border/70 hover:bg-background/45"
                key={row.id}
                onClick={() => onViewDetails(row.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onViewDetails(row.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <TableCell className="px-6 py-4 text-sm font-medium text-foreground">
                  {row.username ?? "Unknown user"}
                </TableCell>
                <TableCell className="px-6 py-4 font-semibold text-foreground">
                  {formatRub(row.amountRub)}
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Badge variant={getPayoutStatusVariant(row.status)}>
                    {getPayoutStatusLabel(row.status)}
                  </Badge>
                </TableCell>
                <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                  {resolvePayoutBank(row)}
                </TableCell>
                <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                  {formatPayoutDateTime(row.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
