"use client";

import { type ComponentType, useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  BadgeDollarSign,
  HandCoins,
  Headset,
  ReceiptText,
  Tag,
  User,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

import { AdminDashboardCodesBlock } from "./admin-dashboard-codes-block";
import { AdminSectionShell } from "./admin-section-shell";
import { AdminSurface } from "./admin-surface";

type DashboardKpiId = "activeSubscriptions" | "errors" | "revenue" | "totalUsers";

type DashboardKpi = {
  icon: ComponentType<{ className?: string }>;
  id: DashboardKpiId;
  title: string;
  value: string;
};

export type DashboardKpiDelta = {
  current: number;
  direction: "down" | "flat" | "up";
  percentChange: number;
  periodDays: 7 | 14 | 30;
  previous: number;
};

export type DashboardKpiDeltaMap = Record<DashboardKpiId, DashboardKpiDelta[]>;

export type AdminRecentActivityItem = {
  actor: string;
  createdAt: string;
  object: string;
  text: string;
  type: "code" | "payout" | "payment" | "registration" | "support" | "tariff";
};

export type AdminDashboardErrorCategory = "deviceSlots" | "payments" | "subscriptions" | "xui";

export type AdminDashboardErrorHistoryItem = {
  category: AdminDashboardErrorCategory;
  createdAt: string;
  message: string;
  object: string;
  source: string;
};

export type AdminDashboardErrorSummary = {
  breakdown: Record<AdminDashboardErrorCategory, number>;
  history: AdminDashboardErrorHistoryItem[];
};

const KPI_PERIOD_OPTIONS = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 14 days", value: "14" },
  { label: "Last 30 days", value: "30" },
] as const;

export function AdminOverviewSection({
  activeSubscriptions,
  codesActiveTab,
  deltaByKpi,
  errorSummary,
  generatedPromoCode,
  generatedReferralCode,
  maxActiveSubscriptions,
  errorsTotal,
  revenueTotal,
  recentActivity,
  totalUsers,
  topReferrers,
}: {
  activeSubscriptions: number;
  codesActiveTab?: string;
  deltaByKpi: DashboardKpiDeltaMap;
  errorSummary: AdminDashboardErrorSummary;
  generatedPromoCode?: string;
  generatedReferralCode?: string;
  maxActiveSubscriptions: number;
  errorsTotal: number;
  revenueTotal: number;
  recentActivity: AdminRecentActivityItem[];
  totalUsers: number;
  topReferrers: Array<{ invites: number; referralCode: string; username: string }>;
}) {
  const [mounted, setMounted] = useState(false);
  const [selectedPeriodDays, setSelectedPeriodDays] = useState<DashboardKpiDelta["periodDays"]>(7);
  const [dialogKpiId, setDialogKpiId] = useState<DashboardKpiId | null>(null);
  const numberFormatter = new Intl.NumberFormat("ru-RU");

  useEffect(() => {
    setMounted(true);
  }, []);

  const cards: DashboardKpi[] = [
    {
      icon: Users,
      id: "totalUsers",
      title: "Total Users",
      value: `${totalUsers}`,
    },
    {
      icon: BadgeCheck,
      id: "activeSubscriptions",
      title: "Active Subs",
      value: `${activeSubscriptions}/${maxActiveSubscriptions === 0 ? "∞" : maxActiveSubscriptions}`,
    },
    {
      icon: BadgeDollarSign,
      id: "revenue",
      title: "Revenue",
      value: `${numberFormatter.format(revenueTotal)} ₽`,
    },
    {
      icon: AlertTriangle,
      id: "errors",
      title: "Errors",
      value: `${errorsTotal}`,
    },
  ];

  function formatAgo(value: string) {
    const date = new Date(value);
    const diffMs = Math.max(0, Date.now() - date.getTime());
    const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

    if (diffMinutes < 60) {
      return `${diffMinutes}min`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h`;
    }

    return `${Math.floor(diffHours / 24)}d`;
  }

  function getActivityIcon(type: AdminRecentActivityItem["type"]) {
    if (type === "payment") return BadgeDollarSign;
    if (type === "code") return Tag;
    if (type === "support") return Headset;
    if (type === "payout") return HandCoins;
    if (type === "tariff") return ReceiptText;
    return Users;
  }

  function getDelta(cardId: DashboardKpiId) {
    return (
      deltaByKpi[cardId].find((item) => item.periodDays === selectedPeriodDays) ??
      deltaByKpi[cardId][0]
    );
  }

  function getDeltaColorClass(direction: DashboardKpiDelta["direction"]) {
    if (direction === "up") {
      return "text-[var(--ok)]";
    }

    if (direction === "down") {
      return "text-[var(--bad)]";
    }

    return "text-muted-foreground";
  }

  function getDeltaArrow(direction: DashboardKpiDelta["direction"]) {
    if (direction === "up") return "↑";
    if (direction === "down") return "↓";
    return "→";
  }

  function formatPercent(value: number) {
    return `${numberFormatter.format(Math.abs(value))}%`;
  }

  function getErrorCategoryLabel(category: AdminDashboardErrorCategory) {
    if (category === "xui") return "3x-ui";
    if (category === "payments") return "Payments";
    if (category === "deviceSlots") return "Device slots";
    return "Subscriptions";
  }

  const selectedDialogCard = dialogKpiId
    ? cards.find((card) => card.id === dialogKpiId) ?? null
    : null;

  return (
    <AdminSectionShell description="" eyebrow="DASHBOARD" id="dashboard" title="">
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            const delta = getDelta(card.id);
            const trendColorClass = getDeltaColorClass(delta.direction);

            return (
              <button
                className="block h-full rounded-panel text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                key={card.id}
                onClick={() => setDialogKpiId(card.id)}
                type="button"
              >
                <AdminSurface className="h-full p-4 md:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <div className="flex size-8 items-center justify-center rounded-card bg-transparent">
                      <Icon className="size-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="mt-2 flex items-end justify-between gap-2">
                    <p className="text-3xl font-semibold leading-none tracking-tight">{card.value}</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${trendColorClass}`}>
                      <span className="text-sm leading-none">{getDeltaArrow(delta.direction)}</span>
                      {formatPercent(delta.percentChange)}
                    </span>
                  </div>
                </AdminSurface>
              </button>
            );
          })}
        </div>

        <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <AdminSurface className="h-full !p-4 md:!p-4">
            {mounted ? (
              <AdminDashboardCodesBlock
                activeTab={codesActiveTab}
                generatedPromoCode={generatedPromoCode}
                generatedReferralCode={generatedReferralCode}
              />
            ) : (
              <div className="min-h-[320px]" />
            )}
          </AdminSurface>

          <AdminSurface className="h-full !p-4 md:!p-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Referral stats</h3>
              </div>

              {topReferrers.length > 0 ? (
                <ul className="max-h-[308px] space-y-2 overflow-y-auto pr-1">
                  {topReferrers.map((item) => (
                    <li
                      className="flex items-center justify-between rounded-card border border-border/70 bg-background/35 px-3 py-2 text-sm"
                      key={`${item.username}:${item.referralCode}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-8 rounded-card bg-transparent">
                          <AvatarFallback className="rounded-card bg-transparent text-muted-foreground">
                            <User className="size-5" />
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.username}</p>
                          <p className="truncate text-xs text-muted-foreground">{item.referralCode}</p>
                        </div>
                      </div>

                      <span className="shrink-0 text-muted-foreground">{item.invites} invites</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-card border border-dashed border-border/70 bg-background/25 px-4 py-10 text-center text-sm text-muted-foreground">
                  No referrer activity yet.
                </div>
              )}
            </div>
          </AdminSurface>
        </div>

        <AdminSurface className="p-4 md:p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Recent activity</h3>
            <Separator className="flex-1" />
          </div>

          {recentActivity.length > 0 ? (
            <ol className="relative flex flex-col gap-0">
              {recentActivity.map((item, index) => {
                const Icon = getActivityIcon(item.type);

                return (
                  <li
                    className="relative grid grid-cols-[40px_minmax(0,1fr)_auto] gap-3 pb-4 last:pb-0"
                    key={`${item.type}-${item.createdAt}-${index}`}
                  >
                    {index < recentActivity.length - 1 ? (
                      <span className="absolute left-5 top-10 h-[calc(100%-2rem)] border-l border-dashed border-border" />
                    ) : null}
                    <span className="relative z-10 flex size-10 items-center justify-center rounded-pill border border-border bg-background">
                      <Icon className="size-4 text-muted-foreground" />
                    </span>
                    <p className="min-w-0 pt-2 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{item.actor}</span>{" "}
                      {item.text}{" "}
                      <span className="font-semibold text-foreground">{item.object}</span>
                    </p>
                    <time className="pt-2 font-mono text-xs text-muted-foreground">
                      {mounted ? formatAgo(item.createdAt) : ""}
                    </time>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="rounded-card border border-dashed border-border/70 bg-background/25 px-4 py-8 text-center text-sm text-muted-foreground">
              No activity yet.
            </div>
          )}
        </AdminSurface>
      </div>

      <Dialog onOpenChange={(open) => !open && setDialogKpiId(null)} open={Boolean(dialogKpiId)}>
        <DialogContent className={dialogKpiId === "errors" ? "sm:max-w-2xl" : "sm:max-w-sm"}>
          <DialogHeader>
            <DialogTitle>
              {dialogKpiId === "errors"
                ? "Errors requiring attention"
                : `${selectedDialogCard?.title ?? "KPI"} delta period`}
            </DialogTitle>
            <DialogDescription>
              {dialogKpiId === "errors"
                ? "Current unresolved errors by system area and recent error history."
                : "Choose the comparison window. The previous period has the same length."}
            </DialogDescription>
          </DialogHeader>

          {dialogKpiId === "errors" ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-2 sm:grid-cols-4">
                {(["xui", "payments", "deviceSlots", "subscriptions"] as const).map((category) => (
                  <div
                    className="rounded-card border border-border/70 bg-background/35 p-3"
                    key={category}
                  >
                    <p className="text-xs text-muted-foreground">{getErrorCategoryLabel(category)}</p>
                    <p className="mt-1 text-2xl font-semibold leading-none">
                      {numberFormatter.format(errorSummary.breakdown[category])}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Error history</p>
                {errorSummary.history.length > 0 ? (
                  <div className="max-h-[360px] overflow-y-auto rounded-card border border-border/70">
                    <ul className="divide-y divide-border/70">
                      {errorSummary.history.map((item, index) => (
                        <li
                          className="grid gap-2 p-3 text-sm sm:grid-cols-[120px_minmax(0,1fr)_auto]"
                          key={`${item.category}-${item.object}-${item.createdAt}-${index}`}
                        >
                          <span className="font-medium">{getErrorCategoryLabel(item.category)}</span>
                          <span className="min-w-0">
                            <span className="font-semibold text-foreground">{item.object}</span>{" "}
                            <span className="text-muted-foreground">{item.message}</span>
                          </span>
                          <time className="font-mono text-xs text-muted-foreground">
                            {mounted ? formatAgo(item.createdAt) : ""}
                          </time>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="rounded-card border border-dashed border-border/70 bg-background/25 px-4 py-8 text-center text-sm text-muted-foreground">
                    No unresolved errors.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <RadioGroup
              className="grid gap-2"
              onValueChange={(value) => setSelectedPeriodDays(Number(value) as DashboardKpiDelta["periodDays"])}
              value={String(selectedPeriodDays)}
            >
              {KPI_PERIOD_OPTIONS.map((option) => (
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-card border border-border/70 bg-background/35 px-3 py-2 text-sm"
                  key={option.value}
                >
                  <RadioGroupItem value={option.value} />
                  {option.label}
                </label>
              ))}
            </RadioGroup>
          )}
        </DialogContent>
      </Dialog>
    </AdminSectionShell>
  );
}
