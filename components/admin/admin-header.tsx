"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SidebarTrigger } from "@/components/ui/sidebar";

const pageTitles: Array<{ prefix: string; title: string }> = [
  { prefix: "/admin/users", title: "Users" },
  { prefix: "/admin/codes", title: "Codes" },
  { prefix: "/admin/tariffs", title: "Tariff Rules" },
  { prefix: "/admin/payments", title: "Payments" },
  { prefix: "/admin/payouts", title: "Payouts" },
  { prefix: "/admin/support", title: "Support" },
  { prefix: "/admin/rules", title: "Documents" },
  { prefix: "/admin/operations", title: "Operations" },
  { prefix: "/admin/account", title: "Account" },
  { prefix: "/admin", title: "Dashboard" },
];

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function getPageTitle(pathname: string) {
  const normalized = normalizePathname(pathname);
  return pageTitles.find((item) => normalized === item.prefix || normalized.startsWith(`${item.prefix}/`))
    ?.title ?? "Dashboard";
}

export function AdminHeader() {
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname() ?? "/admin";
  const title = getPageTitle(pathname);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    function onScroll() {
      const currentY = window.scrollY;
      const previousY = lastScrollYRef.current;

      if (currentY <= 16) {
        setIsVisible(true);
        lastScrollYRef.current = currentY;
        return;
      }

      if (currentY > previousY + 4) {
        setIsVisible(false);
      } else if (currentY < previousY - 4) {
        setIsVisible(true);
      }

      lastScrollYRef.current = currentY;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-4 z-50 transition-transform duration-200 will-change-transform ${
        isVisible ? "translate-y-0" : "-translate-y-24"
      } md:translate-y-0`}
    >
      <div className="mx-auto w-full max-w-[1200px] px-6">
        <div className="rounded-card border border-border/70 bg-background/70 px-3 py-3 backdrop-blur md:px-3 md:py-3">
          <div className="flex items-center justify-between gap-6">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="rounded-[16px] border border-border/70" />
              <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                {title}
              </h1>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
