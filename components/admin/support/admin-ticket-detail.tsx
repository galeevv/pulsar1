"use client";

import { useEffect, useRef, useState } from "react";

import { SendHorizontal, UserRound } from "lucide-react";

import { SupportMessageItem } from "@/components/support/support-message-item";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminSupportTicketDetailSerialized } from "@/lib/support/client-types";
import { getSupportCategoryLabel } from "@/lib/support/helpers";
import { createTicketMessageSchema } from "@/lib/support/validators";

import { SupportStatusBadge } from "@/components/support/support-status-badge";

import { AdminTicketStatusSelect } from "./admin-ticket-status-select";

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

export function AdminTicketDetail({
  isLoading,
  isSavingStatus,
  isSendingMessage,
  onSendMessage,
  onStatusChange,
  ticket,
}: {
  isLoading: boolean;
  isSavingStatus: boolean;
  isSendingMessage: boolean;
  onSendMessage: (message: string) => Promise<void>;
  onStatusChange: (status: AdminSupportTicketDetailSerialized["status"]) => Promise<void>;
  ticket: AdminSupportTicketDetailSerialized | null;
}) {
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
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

  async function handleStatusSelect(nextStatus: AdminSupportTicketDetailSerialized["status"]) {
    if (!ticket || isSavingStatus || nextStatus === ticket.status) {
      return;
    }

    await onStatusChange(nextStatus);
  }

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
        <Skeleton className="h-12 w-full rounded-card" />
        <Skeleton className="h-72 w-full rounded-card" />
        <Skeleton className="h-32 w-full rounded-card" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="rounded-card border border-dashed border-border bg-background/30 px-4 py-10 text-center text-sm text-muted-foreground">
        Выберите тикет слева, чтобы открыть детали.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Детали тикета</p>
          <div className="flex flex-wrap items-center gap-2">
            <SupportStatusBadge className="h-9 px-4 text-sm" status={ticket.status} />
            <Badge className="h-9 px-4 text-sm" variant="secondary">
              {getSupportCategoryLabel(ticket.category)}
            </Badge>
          </div>
        </div>
        <div className="flex w-full flex-col items-start gap-1 sm:w-auto">
          <AdminTicketStatusSelect
            disabled={isSavingStatus}
            onValueChange={(nextStatus) => void handleStatusSelect(nextStatus)}
            value={ticket.status}
          />
          {isSavingStatus ? <p className="text-xs text-muted-foreground">Сохраняем статус...</p> : null}
        </div>
      </div>

      <div className="rounded-card border border-border bg-background/30 p-card-compact md:p-card-compact-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              <span className="break-words [overflow-wrap:anywhere]">
                #{ticket.id} · {ticket.subject}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Создан: {formatDateTime(ticket.createdAt)}</span>
            <span className="text-border">•</span>
            <span>Обновлен: {formatDateTime(ticket.updatedAt)}</span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-border/70 bg-background/20" ref={messagesContainerRef}>
        <ScrollArea className="h-[46svh] min-h-[300px] p-card-compact md:h-[460px] md:p-card-compact-md [&_[data-slot=scroll-area-viewport]]:overflow-x-hidden">
          {ticket.messages.length ? (
            <div className="min-w-0 space-y-3">
              {ticket.messages.map((entry) => (
                <div className="min-w-0" key={entry.id}>
                  <SupportMessageItem
                    createdAt={entry.createdAt}
                    message={entry.message}
                    senderType={entry.senderType}
                  />
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
          <form className="space-y-2" onSubmit={handleSendMessage}>
            <div className="flex items-center gap-2">
              <Input
                className="h-11"
                disabled={isSendingMessage}
                maxLength={2000}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ответ пользователю"
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
                <span className="sr-only">Отправить сообщение</span>
              </Button>
            </div>
            {messageError ? <p className="text-xs text-destructive">{messageError}</p> : null}
          </form>
        </div>
      </div>

      <Dialog onOpenChange={setIsUserInfoOpen} open={isUserInfoOpen}>
        <DialogTrigger asChild>
          <Button className="h-button w-full px-button-x sm:w-auto" radius="card" type="button" variant="outline">
            <UserRound className="size-4" />
            Информация о пользователе
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[88svh] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
          <DialogHeader className="text-left">
            <DialogTitle>Профиль пользователя</DialogTitle>
            <DialogDescription>Контекст клиента для оперативной обработки обращения.</DialogDescription>
          </DialogHeader>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Сводка</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>
                User ID: <span className="font-medium text-foreground">{ticket.user.id}</span>
              </p>
              <p>
                Username: <span className="font-medium text-foreground">{ticket.user.username}</span>
              </p>
              {ticket.user.activeSubscription ? (
                <>
                  <p>
                    Тариф:{" "}
                    <span className="font-medium text-foreground">
                      {ticket.user.activeSubscription.tariffName}
                    </span>
                  </p>
                  <p>
                    Подписка активна: <span className="font-medium text-foreground">Да</span>
                  </p>
                  <p>
                    Окончание:{" "}
                    <span className="font-medium text-foreground">
                      {formatDateTime(ticket.user.activeSubscription.endsAt)}
                    </span>
                  </p>
                  <p>
                    Устройств:{" "}
                    <span className="font-medium text-foreground">
                      {ticket.user.activeSubscription.devices} / {ticket.user.activeSubscription.deviceLimit}
                    </span>
                  </p>
                </>
              ) : (
                <p>
                  Подписка активна: <span className="font-medium text-foreground">Нет</span>
                </p>
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
}
