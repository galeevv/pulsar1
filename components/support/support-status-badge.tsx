import type { SupportTicketStatus } from "@/lib/support/constants";
import { getSupportStatusLabel } from "@/lib/support/helpers";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function getStatusVariant(status: SupportTicketStatus) {
  if (status === "waiting_user") {
    return "success" as const;
  }

  if (status === "in_progress") {
    return "warning" as const;
  }

  if (status === "closed") {
    return "secondary" as const;
  }

  return "default" as const;
}

export function SupportStatusBadge({
  className,
  status,
}: {
  className?: string;
  status: SupportTicketStatus;
}) {
  return (
    <Badge className={cn("h-6 px-2.5 text-[11px]", className)} variant={getStatusVariant(status)}>
      {getSupportStatusLabel(status)}
    </Badge>
  );
}
