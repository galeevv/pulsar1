"use client";

import { useCallback, useMemo, useState } from "react";

import { Headset, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type {
  SupportApiError,
  UserSupportTicketCreateResponse,
  UserSupportTicketDetailResponse,
  UserSupportTicketDetailSerialized,
  UserSupportTicketListItemSerialized,
  UserSupportTicketListResponse,
} from "@/lib/support/client-types";

import { SupportTicketCreateForm } from "./support-ticket-create-form";
import { SupportTicketDetail } from "./support-ticket-detail";
import { SupportTicketList } from "./support-ticket-list";

type SupportView = "list" | "create" | "detail";

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as SupportApiError & T;
  if (!response.ok) {
    throw new Error(payload.error || "Не удалось выполнить запрос.");
  }

  return payload as T;
}

export function SupportDialog() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<SupportView>("list");

  const [tickets, setTickets] = useState<UserSupportTicketListItemSerialized[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [activeTicket, setActiveTicket] = useState<UserSupportTicketDetailSerialized | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [messageSubmitting, setMessageSubmitting] = useState(false);

  const dialogDescription = useMemo(() => {
    if (view === "create") {
      return "Опишите проблему, и мы ответим в этом же тикете.";
    }

    if (view === "detail") {
      return "История обращения и сообщения с поддержкой.";
    }

    return "Ваши тикеты.";
  }, [view]);

  const loadTickets = useCallback(async () => {
    setListLoading(true);
    try {
      const payload = await requestJson<UserSupportTicketListResponse>("/api/support/tickets");
      setTickets(payload.tickets);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось загрузить тикеты.", {
        position: "bottom-right",
      });
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadTicketDetail = useCallback(async (ticketId: number) => {
    setDetailLoading(true);
    setActiveTicket(null);
    try {
      const payload = await requestJson<UserSupportTicketDetailResponse>(
        `/api/support/tickets/${ticketId}`
      );
      setActiveTicket(payload.ticket);
    } catch (error) {
      setActiveTicket(null);
      toast.error(error instanceof Error ? error.message : "Не удалось загрузить тикет.", {
        position: "bottom-right",
      });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      return;
    }

    setView("list");
    setActiveTicketId(null);
    setActiveTicket(null);
    void loadTickets();
  }

  async function handleCreateTicket(payload: {
    category: string;
    message: string;
    subject: string;
  }) {
    setCreateSubmitting(true);
    try {
      const response = await requestJson<UserSupportTicketCreateResponse>("/api/support/tickets", {
        body: JSON.stringify(payload),
        method: "POST",
      });
      toast.success("Тикет успешно отправлен.", { position: "bottom-right" });

      setView("detail");
      setActiveTicketId(response.ticketId);
      await Promise.all([loadTickets(), loadTicketDetail(response.ticketId)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось создать тикет.", {
        position: "bottom-right",
      });
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function handleOpenTicket(ticketId: number) {
    setActiveTicketId(ticketId);
    setView("detail");
    await loadTicketDetail(ticketId);
    await loadTickets();
  }

  async function handleSendMessage(message: string) {
    if (!activeTicketId) {
      return;
    }

    setMessageSubmitting(true);
    try {
      await requestJson<{ ok: true }>(`/api/support/tickets/${activeTicketId}/messages`, {
        body: JSON.stringify({ message }),
        method: "POST",
      });
      await Promise.all([loadTicketDetail(activeTicketId), loadTickets()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось отправить сообщение.", {
        position: "bottom-right",
      });
    } finally {
      setMessageSubmitting(false);
    }
  }

  function renderContent() {
    if (view === "create") {
      return (
        <SupportTicketCreateForm
          isSubmitting={createSubmitting}
          onSubmit={handleCreateTicket}
        />
      );
    }

    if (view === "detail") {
      return (
        <SupportTicketDetail
          key={`${activeTicketId ?? "none"}-${activeTicket?.updatedAt ?? "initial"}`}
          isLoading={detailLoading}
          isSendingMessage={messageSubmitting}
          onBack={() => {
            setView("list");
            setActiveTicket(null);
          }}
          onSendMessage={handleSendMessage}
          ticket={activeTicket}
        />
      );
    }

    return (
      <SupportTicketList
        isLoading={listLoading}
        onOpenTicket={(ticketId) => void handleOpenTicket(ticketId)}
        tickets={tickets}
      />
    );
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button className="h-button w-full px-button-x" radius="card" type="button" variant="outline">
          <Headset className="size-4" />
          Свзяться с поддержкой
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100svh-1.5rem)] overflow-x-hidden overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
        <DialogHeader className="text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle>Поддержка</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </div>

            {view === "list" ? (
              <Button
                className="h-button shrink-0 px-button-x"
                onClick={() => setView("create")}
                radius="card"
                type="button"
                variant="outline"
              >
                <Plus className="size-4" />
                Создать тикет
              </Button>
            ) : null}
          </div>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
