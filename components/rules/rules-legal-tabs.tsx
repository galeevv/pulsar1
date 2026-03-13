"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LegalDocuments } from "@/lib/legal-documents";

type LegalTab = "agreement" | "offer" | "privacy";

export function RulesLegalTabs({
  legalDocuments,
}: {
  legalDocuments: LegalDocuments;
}) {
  const [activeTab, setActiveTab] = useState<LegalTab>("agreement");

  return (
    <Tabs
      className="gap-4"
      defaultValue="agreement"
      onValueChange={(value) => setActiveTab(value as LegalTab)}
      value={activeTab}
    >
      <div className="md:hidden">
        <Select onValueChange={(value) => setActiveTab(value as LegalTab)} value={activeTab}>
          <SelectTrigger className="h-11 w-full rounded-card border border-border bg-background/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="agreement">Пользовательское соглашение</SelectItem>
            <SelectItem value="offer">Публичная оферта</SelectItem>
            <SelectItem value="privacy">Политика конфиденциальности</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TabsList
        className="hidden h-11 w-full grid-cols-3 rounded-card border border-border bg-background/40 p-1 md:grid"
        variant="default"
      >
        <TabsTrigger value="agreement">Пользовательское соглашение</TabsTrigger>
        <TabsTrigger value="offer">Публичная оферта</TabsTrigger>
        <TabsTrigger value="privacy">Политика конфиденциальности</TabsTrigger>
      </TabsList>

      <TabsContent className="mt-0" value="agreement">
        <div className="rounded-card border border-border/70 bg-card/40 p-card md:p-card-md">
          <article className="whitespace-pre-line text-sm leading-7 text-foreground md:text-base">
            {legalDocuments.userAgreementText}
          </article>
        </div>
      </TabsContent>

      <TabsContent className="mt-0" value="offer">
        <div className="rounded-card border border-border/70 bg-card/40 p-card md:p-card-md">
          <article className="whitespace-pre-line text-sm leading-7 text-foreground md:text-base">
            {legalDocuments.publicOfferText}
          </article>
        </div>
      </TabsContent>

      <TabsContent className="mt-0" value="privacy">
        <div className="rounded-card border border-border/70 bg-card/40 p-card md:p-card-md">
          <article className="whitespace-pre-line text-sm leading-7 text-foreground md:text-base">
            {legalDocuments.privacyPolicyText}
          </article>
        </div>
      </TabsContent>
    </Tabs>
  );
}
