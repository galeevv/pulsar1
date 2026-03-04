import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LandingHeroSection() {
  return (
    <section
      id="hero"
      className="scroll-mt-0 min-h-[100svh] pt-8 pb-10 md:pt-10 md:pb-12"
    >
      <div className="grid min-h-[calc(100svh-152px)] grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-12">
        <div className="order-2 space-y-6 md:order-1">
          <h1 className="text-h1 font-semibold tracking-tight">
            Сжатый гигант.
            <br />
            Ритм вселенной.
          </h1>
          <p className="text-lead max-w-xl text-muted-foreground">
            Пульс света, измеряющий время и расстояние.
            <br />
            Ядро стабильности в бескрайнем космосе.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-button px-button-x" radius="card">
              <Link href="/login">Войти</Link>
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
    </section>
  );
}
