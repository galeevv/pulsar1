import { MessageSquare, Reply } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { UserSupportTicketListItemSerialized } from "@/lib/support/client-types";
import { getSupportCategoryLabel } from "@/lib/support/helpers";

import { SupportStatusBadge } from "./support-status-badge";

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function SupportTicketCard({
  onOpen,
  ticket,
}: {
  onOpen: (ticketId: number) => void;
  ticket: UserSupportTicketListItemSerialized;
}) {
  return (
    <button
      className="block w-full cursor-pointer text-left"
      onClick={() => onOpen(ticket.id)}
      type="button"
    >
      <Card className="transition-colors hover:border-border hover:bg-background/70">
        <CardContent className="p-card-compact md:p-card-compact-md">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-foreground">#{ticket.id}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground">{ticket.subject}</p>
            </div>
            <SupportStatusBadge status={ticket.status} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare className="size-3.5" />
              {getSupportCategoryLabel(ticket.category)}
            </span>
            <span>•</span>
            <span>Обновлен: {formatDateTime(ticket.lastMessageAt ?? ticket.updatedAt)}</span>
          </div>

          {ticket.unreadForUser ? (
            <Badge className="mt-3 h-6 px-2.5 text-[11px]" variant="warning">
              <Reply className="mr-1 size-3.5" />
              Новый ответ
            </Badge>
          ) : null}
        </CardContent>
      </Card>
    </button>
  );
}
