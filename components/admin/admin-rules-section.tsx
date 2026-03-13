"use client";

import { useState } from "react";
import Link from "next/link";

import { updateLegalDocumentsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LegalDocuments } from "@/lib/legal-documents";

import { AdminSectionShell } from "./admin-section-shell";
import { AdminSurface } from "./admin-surface";

type LegalTab = "agreement" | "offer" | "privacy";

const LEGAL_TAB_FIELD: Record<LegalTab, keyof LegalDocuments> = {
  agreement: "userAgreementText",
  offer: "publicOfferText",
  privacy: "privacyPolicyText",
};

const LEGAL_TAB_LABEL: Record<LegalTab, string> = {
  agreement: "Пользовательское соглашение",
  offer: "Публичная оферта",
  privacy: "Политика конфиденциальности",
};

export function AdminRulesSection({
  legalDocuments,
}: {
  legalDocuments: LegalDocuments;
}) {
  const [activeTab, setActiveTab] = useState<LegalTab>("agreement");
  const [documents, setDocuments] = useState<LegalDocuments>(() => ({
    privacyPolicyText: legalDocuments.privacyPolicyText,
    publicOfferText: legalDocuments.publicOfferText,
    userAgreementText: legalDocuments.userAgreementText,
  }));
  const activeField = LEGAL_TAB_FIELD[activeTab];
  const activeLabel = LEGAL_TAB_LABEL[activeTab];
  const activeValue = documents[activeField];

  function handleDocumentChange(nextValue: string) {
    setDocuments((previous) => ({
      ...previous,
      [activeField]: nextValue,
    }));
  }

  return (
    <AdminSectionShell
      description="Управление юридическими документами, которые публикуются на странице /rules."
      eyebrow="LEGAL"
      id="rules"
      title="Юридическая информация"
    >
      <AdminSurface>
        <form action={updateLegalDocumentsAction} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Публичная страница:{" "}
            <Link className="text-foreground underline underline-offset-4" href="/rules" target="_blank">
              /rules
            </Link>
          </p>

          <Tabs
            className="gap-2"
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
          </Tabs>

          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="admin-legal-document-text">
              {activeLabel}
            </label>
            <textarea
              className="min-h-[420px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-6 shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              id="admin-legal-document-text"
              onChange={(event) => handleDocumentChange(event.target.value)}
              required
              value={activeValue}
            />
          </div>

          <input name="userAgreementText" type="hidden" value={documents.userAgreementText} />
          <input name="publicOfferText" type="hidden" value={documents.publicOfferText} />
          <input name="privacyPolicyText" type="hidden" value={documents.privacyPolicyText} />

          <div className="flex justify-center">
            <Button className="h-button px-button-x" radius="card" type="submit">
              Сохранить юридическую информацию
            </Button>
          </div>
        </form>
      </AdminSurface>
    </AdminSectionShell>
  );
}

