"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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

  return (
    <AdminSectionShell
      description="Manage all code mechanics in one place: referral, invite and promo."
      eyebrow="CODES"
      id="codes"
      title="Referral, Invite and Promo Codes"
    >
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
    </AdminSectionShell>
  );
}
