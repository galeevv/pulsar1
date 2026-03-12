"use client";

import { useEffect, useRef, useState } from "react";

import { ArrowLeft, Lock, SendHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserSupportTicketDetailSerialized } from "@/lib/support/client-types";
import { getSupportCategoryLabel } from "@/lib/support/helpers";
import { createTicketMessageSchema } from "@/lib/support/validators";

import { SupportMessageItem } from "./support-message-item";
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

export function SupportTicketDetail({
  isLoading,
  isSendingMessage,
  onBack,
  onSendMessage,
  ticket,
}: {
  isLoading: boolean;
  isSendingMessage: boolean;
  onBack: () => void;
  onSendMessage: (message: string) => Promise<void>;
  ticket: UserSupportTicketDetailSerialized | null;
}) {
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const ticketId = ticket?.id ?? null;
  const messagesCount = ticket?.messages.length ?? 0;

  function scrollMessagesToBottom() {
    if (!messagesContainerRef.current) {
      return;
    }

    const viewport = messagesContainerRef.current.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    if (!viewport) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
  }

  useEffect(() => {
    if (isLoading || ticketId === null) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      scrollMessagesToBottom();
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isLoading, ticketId, messagesCount]);

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = createTicketMessageSchema.safeParse({ message });
    if (!parsed.success) {
      setMessageError("Сообщение должно содержать от 1 до 2000 символов.");
      return;
    }

    setMessageError(null);
    await onSendMessage(parsed.data.message);
    setMessage("");
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-36 rounded-card" />
        <Skeleton className="h-20 w-full rounded-card" />
        <Skeleton className="h-96 w-full rounded-card" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-3">
        <Button onClick={onBack} radius="card" type="button" variant="outline">
          <ArrowLeft className="size-4" />
          К списку тикетов
        </Button>
        <div className="rounded-card border border-dashed border-border bg-background/30 px-4 py-10 text-center text-sm text-muted-foreground">
          Тикет не найден.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button onClick={onBack} radius="card" type="button" variant="outline">
          <ArrowLeft className="size-4" />
          К списку
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <SupportStatusBadge className="h-9 px-4 text-sm" status={ticket.status} />
          <Badge className="h-9 px-4 text-sm" variant="secondary">
            {getSupportCategoryLabel(ticket.category)}
          </Badge>
        </div>
      </div>

      <div className="rounded-card border border-border bg-background/30 p-card-compact md:p-card-compact-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              <span className="break-words [overflow-wrap:anywhere]">
                #{ticket.id} · {ticket.subject}
              </span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Создан: {formatDateTime(ticket.createdAt)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-border/70 bg-background/20" ref={messagesContainerRef}>
        <ScrollArea className="h-[42svh] min-h-[260px] p-card-compact md:h-[420px] md:p-card-compact-md [&_[data-slot=scroll-area-viewport]]:overflow-x-hidden">
          {ticket.messages.length ? (
            <div className="min-w-0 space-y-3">
              {ticket.messages.map((entry, index) => (
                <div className="min-w-0" key={entry.id}>
                  <SupportMessageItem
                    createdAt={entry.createdAt}
                    message={entry.message}
                    senderType={entry.senderType}
                  />
                  {index < ticket.messages.length - 1 ? <Separator className="mt-3" /> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-card border border-dashed border-border bg-background/30 px-4 py-6 text-center text-sm text-muted-foreground">
              Сообщений пока нет.
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-border/70 bg-background/50 p-card-compact md:p-card-compact-md">
          {ticket.userCanReply ? (
            <form className="space-y-2" onSubmit={handleSendMessage}>
              <div className="flex items-center gap-2">
                <Input
                  className="h-11"
                  disabled={isSendingMessage}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Напишите сообщение поддержке"
                  value={message}
                />
                <Button
                  className="size-11 shrink-0"
                  disabled={isSendingMessage}
                  radius="card"
                  size="icon"
                  type="submit"
                >
                  <SendHorizontal className="size-4" />
                  <span className="sr-only">Отправить</span>
                </Button>
              </div>
              {messageError ? <p className="text-xs text-destructive">{messageError}</p> : null}
            </form>
          ) : (
            <div className="rounded-card border border-border bg-background/20 p-card-compact md:p-card-compact-md">
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="size-4" />
                Тикет закрыт. Для нового вопроса создайте новое обращение.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Закрыт: {formatDateTime(ticket.closedAt ?? ticket.updatedAt)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
