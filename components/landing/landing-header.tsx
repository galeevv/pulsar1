"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Orbit } from "lucide-react";

import { LandingSessionLoader } from "@/components/landing/landing-session-loader";
import { useLandingLoginRedirect } from "@/components/landing/use-landing-login-redirect";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  const [isVisible, setIsVisible] = useState(true);
  const { handleLoginClick, isCheckingSession } = useLandingLoginRedirect();
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
    <>
      <header
        className={`sticky top-4 z-50 transition-transform duration-200 will-change-transform ${
          isVisible ? "translate-y-0" : "-translate-y-24"
        } md:translate-y-0`}
      >
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <div className="rounded-card border border-border/70 bg-background/70 px-3 py-3 backdrop-blur md:px-3 md:py-3">
            <div className="flex items-center justify-between gap-6">
              <Link
                aria-label="Pulsar"
                className="flex items-center gap-2 pl-2 text-foreground transition-colors"
                href="/"
              >
                <Orbit className="h-6 w-6 text-foreground" />
                <span className="text-logo font-semibold tracking-wide">PULSAR</span>
              </Link>

              <Button
                className="h-10 px-button-x"
                disabled={isCheckingSession}
                radius="card"
                type="button"
                onClick={handleLoginClick}
              >
                Войти
              </Button>
            </div>
          </div>
        </div>
      </header>

      <LandingSessionLoader isVisible={isCheckingSession} />
    </>
  );
}