"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { BarChart3, Gift, Ticket, Users } from "lucide-react";

import { AdminSurface } from "@/components/admin/admin-surface";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AdminInviteCodesSection } from "./admin-invite-codes-section";
import { AdminPromoCodesSection } from "./admin-promo-codes-section";
import { AdminReferralCodesSection } from "./admin-referral-codes-section";
import { AdminSectionShell } from "./admin-section-shell";

type CodesTab = "referral" | "invite" | "promo";

function normalizeTab(value: string | null): CodesTab {
  if (value === "invite" || value === "promo" || value === "referral") {
    return value;
  }

  return "referral";
}

function isNotExpired(expiresAt: Date | null) {
  if (!expiresAt) {
    return true;
  }

  return expiresAt.getTime() > Date.now();
}

function SummaryCard({
  icon: Icon,
  title,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
}) {
  return (
    <AdminSurface className="p-4 md:p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex size-8 items-center justify-center rounded-card bg-transparent">
          <Icon className="size-5 text-muted-foreground" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold leading-none tracking-tight">{value}</p>
    </AdminSurface>
  );
}

export function AdminMarketingSection({
  inviteCodes,
  promoCodes,
  referralCodes,
  referralProgramSettings,
}: React.ComponentProps<typeof AdminInviteCodesSection> &
  React.ComponentProps<typeof AdminPromoCodesSection> &
  React.ComponentProps<typeof AdminReferralCodesSection>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<CodesTab>(normalizeTab(searchParams.get("tab")));

  useEffect(() => {
    setActiveTab(normalizeTab(searchParams.get("tab")));
  }, [searchParams]);

  function handleTabChange(nextTabValue: string) {
    const nextTab = normalizeTab(nextTabValue);
    setActiveTab(nextTab);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", nextTab);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  const summary = useMemo(() => {
    const activeInviteCodes = inviteCodes.filter(
      (item) => item.isEnabled && !item.usedAt && !item.usedBy && isNotExpired(item.expiresAt)
    ).length;
    const activeReferralCodes = referralCodes.filter(
      (item) => item.isEnabled && isNotExpired(item.expiresAt)
    ).length;
    const activePromoCodes = promoCodes.filter(
      (item) => item.isEnabled && isNotExpired(item.expiresAt)
    ).length;

    const inviteUses = inviteCodes.filter((item) => Boolean(item.usedAt)).length;
    const referralUses = referralCodes.reduce((sum, item) => sum + item._count.uses, 0);
    const promoRedemptions = promoCodes.reduce((sum, item) => sum + item._count.redemptions, 0);
    const totalUses = inviteUses + referralUses + promoRedemptions;

      return {
        activeInviteCodes,
        activePromoCodes,
        activeReferralCodes,
        totalUses,
      };
  }, [inviteCodes, promoCodes, referralCodes]);

  return (
    <AdminSectionShell
      description="Manage all registration and rewards codes in one place."
      eyebrow="CODES"
      id="codes"
      title="Codes"
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={Ticket} title="Active Invite Codes" value={String(summary.activeInviteCodes)} />
          <SummaryCard icon={Users} title="Active Referral Codes" value={String(summary.activeReferralCodes)} />
          <SummaryCard icon={Gift} title="Active Promo Codes" value={String(summary.activePromoCodes)} />
          <SummaryCard
            icon={BarChart3}
            title="Total Uses"
            value={String(summary.totalUses)}
          />
        </div>

        <Tabs className="gap-4" onValueChange={handleTabChange} value={activeTab}>
          <div className="md:hidden">
            <Select onValueChange={handleTabChange} value={activeTab}>
              <SelectTrigger className="h-11 w-full rounded-card border border-border bg-background/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="referral">Referral Codes</SelectItem>
                <SelectItem value="invite">Invite Codes</SelectItem>
                <SelectItem value="promo">Promo Codes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsList
            className="hidden h-11 w-full grid-cols-3 rounded-card border border-border bg-background/40 p-0 md:grid"
            variant="default"
          >
            <TabsTrigger value="referral">Referral Codes</TabsTrigger>
            <TabsTrigger value="invite">Invite Codes</TabsTrigger>
            <TabsTrigger value="promo">Promo Codes</TabsTrigger>
          </TabsList>

          <TabsContent className="mt-0" value="referral">
            <AdminReferralCodesSection
              embedded
              referralCodes={referralCodes}
              referralProgramSettings={referralProgramSettings}
            />
          </TabsContent>

          <TabsContent className="mt-0" value="invite">
            <AdminInviteCodesSection embedded inviteCodes={inviteCodes} />
          </TabsContent>

          <TabsContent className="mt-0" value="promo">
            <AdminPromoCodesSection embedded promoCodes={promoCodes} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminSectionShell>
  );
}
