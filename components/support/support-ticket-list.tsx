import { MessageCircleDashed } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserSupportTicketListItemSerialized } from "@/lib/support/client-types";

import { SupportTicketCard } from "./support-ticket-card";

export function SupportTicketList({
  isLoading,
  onOpenTicket,
  tickets,
}: {
  isLoading: boolean;
  onOpenTicket: (ticketId: number) => void;
  tickets: UserSupportTicketListItemSerialized[];
}) {
  const shouldConstrainHeight = tickets.length > 3;

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="h-24 w-full rounded-card" />
        </div>
      ) : tickets.length ? (
        shouldConstrainHeight ? (
          <ScrollArea className="h-[48svh] rounded-card border border-border/70 bg-background/20 p-2 md:h-[520px]">
            <div className="space-y-3 pr-1">
              {tickets.map((ticket) => (
                <SupportTicketCard key={ticket.id} onOpen={onOpenTicket} ticket={ticket} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <SupportTicketCard key={ticket.id} onOpen={onOpenTicket} ticket={ticket} />
            ))}
          </div>
        )
      ) : (
        <div className="rounded-card border border-dashed border-border bg-background/30 px-4 py-10 text-center">
          <MessageCircleDashed className="mx-auto mb-3 size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">У вас пока нет обращений в поддержку.</p>
        </div>
      )}
    </div>
  );
}
