import { MessageCircleDashed, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserSupportTicketListItemSerialized } from "@/lib/support/client-types";

import { SupportTicketCard } from "./support-ticket-card";

export function SupportTicketList({
  isLoading,
  onCreateClick,
  onOpenTicket,
  tickets,
}: {
  isLoading: boolean;
  onCreateClick: () => void;
  onOpenTicket: (ticketId: number) => void;
  tickets: UserSupportTicketListItemSerialized[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Ваши обращения в поддержку и ответы команды.
        </p>
        <Button onClick={onCreateClick} radius="card" type="button" variant="outline">
          <Plus className="size-4" />
          Создать тикет
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="h-24 w-full rounded-card" />
        </div>
      ) : tickets.length ? (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <SupportTicketCard key={ticket.id} onOpen={onOpenTicket} ticket={ticket} />
          ))}
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-border bg-background/30 px-4 py-10 text-center">
          <MessageCircleDashed className="mx-auto mb-3 size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">У вас пока нет обращений в поддержку.</p>
        </div>
      )}
    </div>
  );
}
