"use client";

import { useState } from "react";

import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { AdminSupportTicketDetailSerialized } from "@/lib/support/client-types";
import { getSupportCategoryLabel } from "@/lib/support/helpers";
import { createTicketMessageSchema } from "@/lib/support/validators";

import { SupportMessageList } from "@/components/support/support-message-list";
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
  const [statusDraft, setStatusDraft] = useState<AdminSupportTicketDetailSerialized["status"]>(
    ticket?.status ?? "open"
  );

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
      <div className="rounded-card border border-border bg-background/30 p-card-compact md:p-card-compact-md">
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            #{ticket.id} · {ticket.subject}
          </p>
          <p className="text-sm text-muted-foreground">{getSupportCategoryLabel(ticket.category)}</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SupportStatusBadge status={ticket.status} />
          <p className="text-xs text-muted-foreground">
            Создан: {formatDateTime(ticket.createdAt)} · Обновлен: {formatDateTime(ticket.updatedAt)}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
          <AdminTicketStatusSelect
            disabled={isSavingStatus}
            onValueChange={setStatusDraft}
            value={statusDraft}
          />
          <Button
            disabled={isSavingStatus || statusDraft === ticket.status}
            onClick={() => void onStatusChange(statusDraft)}
            radius="card"
            type="button"
            variant="outline"
          >
            <Save className="size-4" />
            {isSavingStatus ? "Сохранение..." : "Сохранить статус"}
          </Button>
        </div>
      </div>

      <SupportMessageList messages={ticket.messages} />

      <form className="space-y-3" onSubmit={handleSendMessage}>
        <p className="text-sm font-medium">Ответ администратора</p>
        <Textarea
          className="min-h-24"
          disabled={isSendingMessage}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Напишите ответ пользователю"
          value={message}
        />
        {messageError ? <p className="text-xs text-destructive">{messageError}</p> : null}
        <Button disabled={isSendingMessage} radius="card" type="submit">
          {isSendingMessage ? "Отправка..." : "Отправить сообщение"}
        </Button>
      </form>

      <Separator />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Информация о пользователе</CardTitle>
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
    </div>
  );
}
