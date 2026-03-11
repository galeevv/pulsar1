"use client";

import { Filter, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminSupportTicketListItemSerialized } from "@/lib/support/client-types";
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_STATUSES,
  type SupportTicketCategory,
  type SupportTicketStatus,
} from "@/lib/support/constants";
import { getSupportCategoryLabel, getSupportStatusLabel } from "@/lib/support/helpers";

import { SupportStatusBadge } from "@/components/support/support-status-badge";

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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="size-4" />
          Фильтры
        </div>
        <Button onClick={onRefresh} radius="card" type="button" variant="outline">
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
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-card" />
          <Skeleton className="h-12 w-full rounded-card" />
          <Skeleton className="h-12 w-full rounded-card" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Пользователь</TableHead>
              <TableHead>Тема</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Последнее сообщение</TableHead>
              <TableHead>Создан</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length ? (
              tickets.map((ticket) => (
                <TableRow
                  className={`cursor-pointer ${
                    selectedTicketId === ticket.id ? "bg-muted/40 hover:bg-muted/50" : ""
                  }`}
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket.id)}
                >
                  <TableCell>#{ticket.id}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{ticket.user.username}</p>
                      {ticket.unreadForAdmin ? (
                        <p className="text-xs text-amber-300">Есть новый ответ пользователя</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate">{ticket.subject}</TableCell>
                  <TableCell>{getSupportCategoryLabel(ticket.category)}</TableCell>
                  <TableCell>
                    <SupportStatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell>{formatDateTime(ticket.lastMessageAt ?? ticket.updatedAt)}</TableCell>
                  <TableCell>{formatDateTime(ticket.createdAt)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="py-10 text-center text-muted-foreground" colSpan={7}>
                  Тикеты не найдены по текущим фильтрам.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
