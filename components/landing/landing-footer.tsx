import Link from "next/link";

import { Orbit } from "lucide-react";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/70 bg-background/60">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8 md:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-foreground">
              <Orbit className="size-5" />
              <span className="text-logo font-semibold tracking-wide">PULSAR</span>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <Link
              className="rounded-card border border-border/70 bg-background/40 px-3 py-2 text-sm text-foreground transition-colors hover:bg-background/70"
              href="/rules"
            >
              Юридическая информация
            </Link>
          </nav>
        </div>

        <div className="mt-6 border-t border-border/60 pt-4">
          <p className="text-xs text-muted-foreground">
            © {currentYear} PULSAR. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
}
