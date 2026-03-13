import type { Metadata } from "next";

import { LandingHeader } from "@/components/landing/landing-header";
import { RulesLegalTabs } from "@/components/rules/rules-legal-tabs";
import { getLegalDocuments } from "@/lib/legal-documents";

export const metadata: Metadata = {
  description: "Юридическая информация сервиса Pulsar.",
  title: "PULSAR • Юридическая информация",
};

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const legalDocuments = await getLegalDocuments();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />

      <main className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-8">
        <section className="space-y-4 py-section md:py-section-md">
          <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            LEGAL
          </p>
          <h1 className="text-h2 font-semibold tracking-tight md:text-h1">Юридическая информация</h1>
          <p className="max-w-[760px] text-sm leading-7 text-muted-foreground md:text-base">
            На странице собраны пользовательское соглашение, публичная оферта и политика
            конфиденциальности.
          </p>

          <RulesLegalTabs legalDocuments={legalDocuments} />
        </section>
      </main>
    </div>
  );
}
