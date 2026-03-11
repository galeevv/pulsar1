"use client";

import type { SupportTicketStatus } from "@/lib/support/constants";
import { SUPPORT_TICKET_STATUSES } from "@/lib/support/constants";
import { getSupportStatusLabel } from "@/lib/support/helpers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AdminTicketStatusSelect({
  disabled,
  onValueChange,
  value,
}: {
  disabled?: boolean;
  onValueChange: (value: SupportTicketStatus) => void;
  value: SupportTicketStatus;
}) {
  return (
    <Select
      disabled={disabled}
      onValueChange={(nextValue) => onValueChange(nextValue as SupportTicketStatus)}
      value={value}
    >
      <SelectTrigger className="w-full md:w-[200px]">
        <SelectValue placeholder="Статус" />
      </SelectTrigger>
      <SelectContent>
        {SUPPORT_TICKET_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {getSupportStatusLabel(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
