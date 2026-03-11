import type { Metadata } from "next";

import { LandingHeader } from "@/components/landing/landing-header";
import { getUserAgreementText } from "@/lib/legal-documents";

export const metadata: Metadata = {
  description: "Условия использования сервиса Pulsar.",
  title: "PULSAR • Пользовательское соглашение",
};

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const userAgreementText = await getUserAgreementText();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />

      <main className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-8">
        <section className="space-y-4 py-section md:py-section-md">
          <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            LEGAL
          </p>
          <h1 className="text-h2 font-semibold tracking-tight md:text-h1">Пользовательское соглашение</h1>
          <p className="max-w-[760px] text-sm leading-7 text-muted-foreground md:text-base">
            Ниже размещена актуальная редакция пользовательского соглашения сервиса Pulsar.
          </p>

          <div className="rounded-card border border-border/70 bg-card/40 p-card md:p-card-md">
            <article className="whitespace-pre-line text-sm leading-7 text-foreground md:text-base">
              {userAgreementText}
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
