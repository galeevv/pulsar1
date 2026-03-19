import { type ComponentType } from "react";
import {
  BadgeCheck,
  BadgeDollarSign,
  Headset,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { AdminDashboardCodesBlock } from "./admin-dashboard-codes-block";
import { AdminSectionShell } from "./admin-section-shell";
import { AdminSurface } from "./admin-surface";

type DashboardKpi = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  value: string;
  trend: number;
  trendPeriod: "this week" | "today";
  trendType: "count" | "currency";
};

export function AdminOverviewSection({
  activeSubscriptions,
  activeSubscriptionsTrend,
  codesActiveTab,
  generatedInviteCode,
  generatedPromoCode,
  generatedReferralCode,
  maxActiveSubscriptions,
  openTickets,
  openTicketsTrend,
  revenueTotal,
  revenueTrend,
  totalUsers,
  totalUsersTrend,
  topReferrers,
}: {
  activeSubscriptions: number;
  activeSubscriptionsTrend: number;
  codesActiveTab?: string;
  generatedInviteCode?: string;
  generatedPromoCode?: string;
  generatedReferralCode?: string;
  maxActiveSubscriptions: number;
  openTickets: number;
  openTicketsTrend: number;
  revenueTotal: number;
  revenueTrend: number;
  totalUsers: number;
  totalUsersTrend: number;
  topReferrers: Array<{ invites: number; referralCode: string; username: string }>;
}) {
  const numberFormatter = new Intl.NumberFormat("ru-RU");

  function formatSigned(value: number) {
    return `${value >= 0 ? "+" : "-"}${numberFormatter.format(Math.abs(value))}`;
  }

  function formatSignedCurrency(value: number) {
    return `${value >= 0 ? "+" : "-"} ${numberFormatter.format(Math.abs(value))} ₽`;
  }

  function getTrendColorClass(value: number) {
    if (value > 0) {
      return "text-emerald-400";
    }

    if (value < 0) {
      return "text-rose-400";
    }

    return "text-amber-400";
  }

  const cards: DashboardKpi[] = [
    {
      icon: Users,
      title: "Total Users",
      trend: totalUsersTrend,
      trendPeriod: "this week",
      trendType: "count",
      value: `${totalUsers}`,
    },
    {
      icon: BadgeCheck,
      title: "Active Subs",
      trend: activeSubscriptionsTrend,
      trendPeriod: "this week",
      trendType: "count",
      value: `${activeSubscriptions}/${maxActiveSubscriptions === 0 ? "∞" : maxActiveSubscriptions}`,
    },
    {
      icon: Headset,
      title: "Open Tickets",
      trend: openTicketsTrend,
      trendPeriod: "today",
      trendType: "count",
      value: `${openTickets}`,
    },
    {
      icon: BadgeDollarSign,
      title: "Revenue",
      trend: revenueTrend,
      trendPeriod: "this week",
      trendType: "currency",
      value: `${numberFormatter.format(revenueTotal)} ₽`,
    },
  ];

  return (
    <AdminSectionShell
      description="Dashboard KPI metrics"
      eyebrow="DASHBOARD"
      id="dashboard"
      title="Dashboard"
    >
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            const TrendIcon = card.trend >= 0 ? TrendingUp : TrendingDown;
            const trendLabel =
              card.trendType === "currency"
                ? formatSignedCurrency(card.trend)
                : formatSigned(card.trend);
            const trendColorClass = getTrendColorClass(card.trend);

            return (
              <AdminSurface className="p-5 md:p-5" key={card.title}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <div className="flex size-8 items-center justify-center rounded-card bg-transparent">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                </div>

                <div className="mt-2 flex items-end justify-between gap-2">
                  <p className="text-3xl font-semibold leading-none tracking-tight">{card.value}</p>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${trendColorClass}`}>
                    <TrendIcon className="size-3.5" />
                    {trendLabel} {card.trendPeriod}
                  </span>
                </div>
              </AdminSurface>
            );
          })}
        </div>

        <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <AdminSurface className="h-full !p-4 md:!p-4">
            <AdminDashboardCodesBlock
              activeTab={codesActiveTab}
              generatedInviteCode={generatedInviteCode}
              generatedPromoCode={generatedPromoCode}
              generatedReferralCode={generatedReferralCode}
            />
          </AdminSurface>

          <AdminSurface className="h-full !p-4 md:!p-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Referral stats</h3>
                <p className="text-sm text-muted-foreground">Top Referrers</p>
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
      </div>
    </AdminSectionShell>
  );
}
