import { ArrowUpRight, MessageSquare, Reply } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { UserSupportTicketListItemSerialized } from "@/lib/support/client-types";
import { getSupportCategoryLabel } from "@/lib/support/helpers";

import { SupportStatusBadge } from "./support-status-badge";

export function SupportTicketCard({
  onOpen,
  ticket,
}: {
  onOpen: (ticketId: number) => void;
  ticket: UserSupportTicketListItemSerialized;
}) {
  return (
    <button
      className="group block w-full cursor-pointer text-left"
      onClick={() => onOpen(ticket.id)}
      type="button"
    >
      <div className="rounded-card border border-border/70 bg-card/40 p-card-compact transition-colors group-hover:border-border group-hover:bg-card/70 md:p-card-compact-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-muted-foreground">Тикет #{ticket.id}</p>
            <p className="line-clamp-2 text-sm font-semibold text-foreground">{ticket.subject}</p>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge className="h-6 gap-1.5 px-2.5 text-[11px]" variant="secondary">
            <MessageSquare className="size-3.5" />
            {getSupportCategoryLabel(ticket.category)}
          </Badge>
          <SupportStatusBadge className="h-6 px-2.5 text-[11px]" status={ticket.status} />
          {ticket.unreadForUser ? (
            <Badge className="h-6 gap-1.5 px-2.5 text-[11px]" variant="warning">
              <Reply className="size-3.5" />
              Новый ответ
            </Badge>
          ) : null}
        </div>
      </div>
    </button>
  );
}
