"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Orbit } from "lucide-react";

import { logoutAction } from "@/app/login/actions";
import { AdminStatusPill } from "@/components/admin/admin-status-pill";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const quickLinks = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/codes/invite", label: "Invite" },
  { href: "/admin/codes/referral", label: "Referral" },
  { href: "/admin/codes/promo", label: "Promo" },
  { href: "/admin/tariffs", label: "Тарифы" },
  { href: "/admin/payments", label: "Платежи" },
  { href: "/admin/support", label: "Поддержка" },
  { href: "/admin/rules", label: "Документы" },
  { href: "/admin/operations", label: "Операции" },
  { href: "/admin/account", label: "Аккаунт" },
];

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function AdminHeader() {
  const pathname = normalizePathname(usePathname() ?? "/admin");

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-admin-shell-x py-admin-shell-y md:px-admin-shell-x-md md:py-admin-shell-y-md">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="rounded-card border border-border/70 md:hidden" />
            <Link className="group inline-flex items-center gap-2" href="/">
              <span className="inline-flex size-8 items-center justify-center rounded-card border border-border/70 bg-card/70 transition-colors group-hover:bg-card">
                <Orbit className="size-4 text-foreground" />
              </span>
              <span className="text-sm font-semibold tracking-[0.2em] text-foreground/90">PULSAR</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <AdminStatusPill label="System healthy" tone="success" />
            <form action={logoutAction}>
              <Button radius="card" size="sm" type="submit" variant="outline">
                Выйти
              </Button>
            </form>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-admin-eyebrow uppercase tracking-[0.22em] text-muted-foreground">
            Control Panel / Admin
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">System Control</h1>
          <p className="max-w-[840px] text-sm text-muted-foreground md:text-base">
            Управление пользователями, кодами, платежами, подписками и операционной стабильностью
            PulsarVPN в едином рабочем пространстве.
          </p>
        </div>

        <nav className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-2 pb-1">
            {quickLinks.map((link) => (
              <Link
                className={cn(
                  "inline-flex h-9 items-center rounded-pill border px-3 text-xs font-medium tracking-wide transition-colors",
                  pathname === link.href
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border/70 bg-card/50 text-muted-foreground hover:border-border hover:text-foreground"
                )}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
