"use client";

import Image from "next/image";

import { LandingSessionLoader } from "@/components/landing/landing-session-loader";
import { useLandingLoginRedirect } from "@/components/landing/use-landing-login-redirect";
import { Button } from "@/components/ui/button";

export function LandingHeroSection() {
  const { handleLoginClick, isCheckingSession } = useLandingLoginRedirect();

  return (
    <section
      id="hero"
      className="scroll-mt-0 min-h-[100svh] pb-10 pt-8 md:pb-12 md:pt-10"
    >
      <div className="grid min-h-[calc(100svh-152px)] grid-cols-1 items-center gap-0 md:grid-cols-2 md:gap-12">
        <div className="order-2 space-y-4 md:order-1 md:space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-4xl md:text-h1">
            Сжатый гигант.
            <br />
            Ритм вселенной.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-base md:text-lead">
            Пульс света для времени и расстояния.
            <br />
            Ядро стабильности в бескрайнем космосе.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="h-button px-button-x"
              disabled={isCheckingSession}
              radius="card"
              type="button"
              onClick={handleLoginClick}
            >
              Войти
            </Button>
            <Button
              asChild
              className="h-button px-button-x"
              radius="card"
              variant="outline"
            >
              <a href="#pulsar-details">Подробнее</a>
            </Button>
          </div>
        </div>

        <div className="order-1 w-full md:order-2">
          <div className="relative aspect-video w-full overflow-hidden rounded-hero border border-border bg-card/40">
            <Image
              alt="Pulsar"
              fill
              className="object-contain p-4 md:p-6"
              priority
              sizes="(max-width: 768px) 100vw, 1200px"
              src="/hero/pulsar.gif"
              unoptimized
            />
          </div>
        </div>
      </div>

      <LandingSessionLoader isVisible={isCheckingSession} />
    </section>
  );
}
