"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { AdminSectionShell } from "@/components/admin/admin-section-shell";
import { AdminSurface } from "@/components/admin/admin-surface";
import {
  AdminTicketList,
  type AdminTicketListFiltersState,
} from "@/components/admin/support/admin-ticket-list";
import { AdminTicketDetail } from "@/components/admin/support/admin-ticket-detail";
import type {
  AdminSupportTicketDetailResponse,
  AdminSupportTicketDetailSerialized,
  AdminSupportTicketListItemSerialized,
  AdminSupportTicketListResponse,
  SupportApiError,
} from "@/lib/support/client-types";

const defaultFilters: AdminTicketListFiltersState = {
  category: "all",
  sortBy: "updated_at",
  sortDirection: "desc",
  status: "all",
};

function buildTicketListUrl(filters: AdminTicketListFiltersState) {
  const params = new URLSearchParams();
  params.set("sortBy", filters.sortBy);
  params.set("sortDirection", filters.sortDirection);

  if (filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.category !== "all") {
    params.set("category", filters.category);
  }

  return `/api/admin/support/tickets?${params.toString()}`;
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as T & SupportApiError;
  if (!response.ok) {
    throw new Error(payload.error || "Не удалось выполнить запрос.");
  }

  return payload as T;
}

export function AdminSupportSection() {
  const [filters, setFilters] = useState<AdminTicketListFiltersState>(defaultFilters);
  const [tickets, setTickets] = useState<AdminSupportTicketListItemSerialized[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [activeTicket, setActiveTicket] = useState<AdminSupportTicketDetailSerialized | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [sendingMessage, setSendingMessage] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const selectedTicketExists = useMemo(
    () => tickets.some((ticket) => ticket.id === activeTicketId),
    [activeTicketId, tickets]
  );

  const loadTickets = useCallback(async () => {
    setListLoading(true);
    try {
      const response = await requestJson<AdminSupportTicketListResponse>(buildTicketListUrl(filters));
      setTickets(response.tickets);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось загрузить тикеты.", {
        position: "bottom-right",
      });
    } finally {
      setListLoading(false);
    }
  }, [filters]);

  const loadTicketDetail = useCallback(async (ticketId: number) => {
    setDetailLoading(true);
    setActiveTicket(null);
    try {
      const response = await requestJson<AdminSupportTicketDetailResponse>(
        `/api/admin/support/tickets/${ticketId}`
      );
      setActiveTicket(response.ticket);
    } catch (error) {
      setActiveTicket(null);
      toast.error(error instanceof Error ? error.message : "Не удалось загрузить детали тикета.", {
        position: "bottom-right",
      });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!tickets.length) {
      if (activeTicketId !== null) {
        setActiveTicketId(null);
        setActiveTicket(null);
      }
      return;
    }

    if (activeTicketId === null || !selectedTicketExists) {
      setActiveTicketId(tickets[0].id);
    }
  }, [activeTicketId, selectedTicketExists, tickets]);

  useEffect(() => {
    if (activeTicketId === null) {
      return;
    }

    void loadTicketDetail(activeTicketId);
  }, [activeTicketId, loadTicketDetail]);

  async function handleSendMessage(message: string) {
    if (!activeTicketId) {
      return;
    }

    setSendingMessage(true);
    try {
      await requestJson<{ ok: true }>(`/api/admin/support/tickets/${activeTicketId}/messages`, {
        body: JSON.stringify({ message }),
        method: "POST",
      });
      await Promise.all([loadTicketDetail(activeTicketId), loadTickets()]);
      toast.success("Сообщение отправлено.", { position: "bottom-right" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось отправить сообщение.", {
        position: "bottom-right",
      });
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleStatusChange(status: AdminSupportTicketDetailSerialized["status"]) {
    if (!activeTicketId) {
      return;
    }

    setSavingStatus(true);
    try {
      await requestJson<{ ok: true }>(`/api/admin/support/tickets/${activeTicketId}/status`, {
        body: JSON.stringify({ status }),
        method: "POST",
      });
      await Promise.all([loadTicketDetail(activeTicketId), loadTickets()]);
      toast.success("Статус тикета обновлен.", { position: "bottom-right" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось обновить статус.", {
        position: "bottom-right",
      });
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <AdminSectionShell
      description="Централизованная обработка тикетов: фильтры, unread-индикаторы, статусы и история сообщений в одном месте."
      eyebrow="SUPPORT"
      id="support"
      title="Тикеты поддержки"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <AdminSurface className="min-w-0">
          <AdminTicketList
            filters={filters}
            isLoading={listLoading}
            onFiltersChange={setFilters}
            onRefresh={() => void loadTickets()}
            onSelectTicket={setActiveTicketId}
            selectedTicketId={activeTicketId}
            tickets={tickets}
          />
        </AdminSurface>
        <AdminSurface className="min-w-0">
          <AdminTicketDetail
            key={`${activeTicketId ?? "none"}-${activeTicket?.updatedAt ?? "initial"}`}
            isLoading={detailLoading}
            isSavingStatus={savingStatus}
            isSendingMessage={sendingMessage}
            onSendMessage={handleSendMessage}
            onStatusChange={handleStatusChange}
            ticket={activeTicket}
          />
        </AdminSurface>
      </div>
    </AdminSectionShell>
  );
}
