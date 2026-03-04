import Link from "next/link";
import { Orbit } from "lucide-react";

import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

const headerLinks = [
  { href: "#overview", label: "Обзор" },
  { href: "#account", label: "Аккаунт" },
  { href: "#users", label: "Пользователи" },
  { href: "#invite-codes", label: "Invite" },
  { href: "#referral-codes", label: "Referral" },
  { href: "#promocodes", label: "Промокоды" },
  { href: "#operations", label: "Операции" },
];

export function AdminHeader() {
  return (
    <header className="sticky top-4 z-50">
      <div className="mx-auto w-full max-w-[1200px] px-6">
        <div className="rounded-card border border-border/70 bg-background/70 px-3 py-3 backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Link
              aria-label="Pulsar"
              className="flex items-center gap-2 pl-2 text-foreground transition-colors"
              href="/"
            >
              <Orbit className="h-6 w-6 text-foreground" />
              <span className="text-logo font-semibold tracking-wide">PULSAR</span>
            </Link>

            <nav className="overflow-x-auto">
              <div className="flex min-w-max items-center gap-2 px-1">
                {headerLinks.map((item) => (
                  <Link
                    className="inline-flex h-10 items-center rounded-card border border-transparent px-4 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>

            <form action={logoutAction}>
              <Button className="h-10 px-button-x" radius="card" type="submit" variant="outline">
                Выйти
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
