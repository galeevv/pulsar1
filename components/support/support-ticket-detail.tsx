"use client";

import { useState } from "react";

import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { UserSupportTicketDetailSerialized } from "@/lib/support/client-types";
import { getSupportCategoryLabel } from "@/lib/support/helpers";
import { createTicketMessageSchema } from "@/lib/support/validators";

import { SupportMessageList } from "./support-message-list";
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
  isClosing,
  isLoading,
  isSendingMessage,
  onBack,
  onCloseTicket,
  onSendMessage,
  ticket,
}: {
  isClosing: boolean;
  isLoading: boolean;
  isSendingMessage: boolean;
  onBack: () => void;
  onCloseTicket: () => Promise<void>;
  onSendMessage: (message: string) => Promise<void>;
  ticket: UserSupportTicketDetailSerialized | null;
}) {
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = createTicketMessageSchema.safeParse({ message });
    if (!parsed.success) {
      setMessageError("Сообщение должно содержать от 10 до 5000 символов.");
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
        <Skeleton className="h-56 w-full rounded-card" />
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
        <SupportStatusBadge status={ticket.status} />
      </div>

      <div className="rounded-card border border-border bg-background/30 p-card-compact md:p-card-compact-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              #{ticket.id} · {ticket.subject}
            </p>
            <p className="text-sm text-muted-foreground">{getSupportCategoryLabel(ticket.category)}</p>
          </div>
          <p className="text-xs text-muted-foreground">Создан: {formatDateTime(ticket.createdAt)}</p>
        </div>
      </div>

      <SupportMessageList messages={ticket.messages} />

      <Separator />

      {ticket.userCanReply ? (
        <form className="space-y-3" onSubmit={handleSendMessage}>
          <p className="text-sm font-medium">Ответить в тикет</p>
          <Textarea
            className="min-h-24"
            disabled={isSendingMessage || isClosing}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Напишите сообщение поддержке"
            value={message}
          />
          {messageError ? <p className="text-xs text-destructive">{messageError}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button disabled={isSendingMessage || isClosing} radius="card" type="submit">
              {isSendingMessage ? "Отправка..." : "Отправить"}
            </Button>
            <Button
              disabled={isSendingMessage || isClosing}
              onClick={() => void onCloseTicket()}
              radius="card"
              type="button"
              variant="outline"
            >
              <CheckCircle2 className="size-4" />
              {isClosing ? "Закрытие..." : "Закрыть тикет"}
            </Button>
          </div>
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
  );
}
