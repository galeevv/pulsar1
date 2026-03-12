"use client";

import { ArrowUpRight, Filter, MessageCircleDashed, MessageSquare, RefreshCcw, Reply, UserRound } from "lucide-react";

import { SupportStatusBadge } from "@/components/support/support-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminSupportTicketListItemSerialized } from "@/lib/support/client-types";
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_STATUSES,
  type SupportTicketCategory,
  type SupportTicketStatus,
} from "@/lib/support/constants";
import { getSupportCategoryLabel, getSupportStatusLabel } from "@/lib/support/helpers";

export type AdminTicketListFiltersState = {
  category: SupportTicketCategory | "all";
  sortBy: "created_at" | "updated_at";
  sortDirection: "asc" | "desc";
  status: SupportTicketStatus | "all";
};

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

export function AdminTicketList({
  filters,
  isLoading,
  onFiltersChange,
  onRefresh,
  onSelectTicket,
  selectedTicketId,
  tickets,
}: {
  filters: AdminTicketListFiltersState;
  isLoading: boolean;
  onFiltersChange: (nextFilters: AdminTicketListFiltersState) => void;
  onRefresh: () => void;
  onSelectTicket: (ticketId: number) => void;
  selectedTicketId: number | null;
  tickets: AdminSupportTicketListItemSerialized[];
}) {
  const shouldConstrainHeight = tickets.length > 4;

  const ticketCards = (
    <div className="space-y-3 pr-1">
      {tickets.map((ticket) => {
        const selected = selectedTicketId === ticket.id;

        return (
          <button
            className="group block w-full cursor-pointer text-left"
            key={ticket.id}
            onClick={() => onSelectTicket(ticket.id)}
            type="button"
          >
            <div
              className={`rounded-card border p-card-compact transition-colors md:p-card-compact-md ${
                selected
                  ? "border-primary/40 bg-primary/10"
                  : "border-border/70 bg-card/40 group-hover:border-border group-hover:bg-card/70"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs text-muted-foreground">Тикет #{ticket.id}</p>
                  <p className="line-clamp-2 text-sm font-semibold text-foreground">{ticket.subject}</p>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <SupportStatusBadge className="h-6 px-2.5 text-[11px]" status={ticket.status} />
                <Badge className="h-6 gap-1.5 px-2.5 text-[11px]" variant="secondary">
                  <MessageSquare className="size-3.5" />
                  {getSupportCategoryLabel(ticket.category)}
                </Badge>
                <Badge className="h-6 gap-1.5 px-2.5 text-[11px]" variant="secondary">
                  <UserRound className="size-3.5" />
                  {ticket.user.username}
                </Badge>
                {ticket.unreadForAdmin ? (
                  <Badge className="h-6 gap-1.5 px-2.5 text-[11px]" variant="warning">
                    <Reply className="size-3.5" />
                    Новый ответ
                  </Badge>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Обновлен: {formatDateTime(ticket.lastMessageAt ?? ticket.updatedAt)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="size-4" />
          Управление тикетами
        </div>
        <Button className="h-button px-button-x" onClick={onRefresh} radius="card" type="button" variant="outline">
          <RefreshCcw className="size-4" />
          Обновить
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <Select
          onValueChange={(value) =>
            onFiltersChange({ ...filters, status: value as SupportTicketStatus | "all" })
          }
          value={filters.status}
        >
          <SelectTrigger>
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {SUPPORT_TICKET_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {getSupportStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) =>
            onFiltersChange({ ...filters, category: value as SupportTicketCategory | "all" })
          }
          value={filters.category}
        >
          <SelectTrigger>
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {SUPPORT_TICKET_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {getSupportCategoryLabel(category)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              sortBy: value as AdminTicketListFiltersState["sortBy"],
            })
          }
          value={filters.sortBy}
        >
          <SelectTrigger>
            <SelectValue placeholder="Сортировать по" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated_at">По обновлению</SelectItem>
            <SelectItem value="created_at">По созданию</SelectItem>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              sortDirection: value as AdminTicketListFiltersState["sortDirection"],
            })
          }
          value={filters.sortDirection}
        >
          <SelectTrigger>
            <SelectValue placeholder="Направление" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Сначала новые</SelectItem>
            <SelectItem value="asc">Сначала старые</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="h-24 w-full rounded-card" />
        </div>
      ) : tickets.length ? (
        shouldConstrainHeight ? (
          <ScrollArea className="h-[54svh] rounded-card border border-border/70 bg-background/20 p-2 md:h-[600px]">
            {ticketCards}
          </ScrollArea>
        ) : (
          ticketCards
        )
      ) : (
        <div className="rounded-card border border-dashed border-border bg-background/30 px-4 py-10 text-center">
          <MessageCircleDashed className="mx-auto mb-3 size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Тикеты не найдены по текущим фильтрам.</p>
        </div>
      )}
    </div>
  );
}
