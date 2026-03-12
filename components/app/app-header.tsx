"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Menu, Orbit } from "lucide-react";

import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const headerLinks = [
  { href: "#tariffs", label: "Тарифы" },
  { href: "#dashboard", label: "Dashboard" },
  { href: "#benefits", label: "Бонусы" },
];

export function AppHeader() {
  const [isVisible, setIsVisible] = useState(true);
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
        <div className="rounded-card border border-border/70 bg-background/70 px-3 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
            <Link
              aria-label="Pulsar"
              className="flex items-center gap-2 pl-2 text-foreground transition-colors lg:justify-self-start"
              href="/"
            >
              <Orbit className="h-6 w-6 text-foreground" />
              <span className="text-logo font-semibold tracking-wide">PULSAR</span>
            </Link>

            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-10 px-3" radius="card" type="button" variant="outline">
                    <Menu className="size-4" />
                    <span className="sr-only">Открыть меню</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {headerLinks.map((item) => (
                    <DropdownMenuItem asChild key={item.href}>
                      <Link href={item.href}>{item.label}</Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <form action={logoutAction}>
                    <DropdownMenuItem asChild>
                      <button className="w-full cursor-pointer text-left" type="submit">
                        Выйти
                      </button>
                    </DropdownMenuItem>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div aria-hidden className="hidden lg:block lg:justify-self-center" />

            <form action={logoutAction} className="hidden lg:block lg:col-start-3 lg:justify-self-end">
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
