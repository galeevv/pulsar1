"use client";

import { Loader2 } from "lucide-react";

type LandingSessionLoaderProps = {
  isVisible: boolean;
};

export function LandingSessionLoader({ isVisible }: LandingSessionLoaderProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[70] inline-flex items-center gap-2 rounded-card border border-border bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur"
      role="status"
    >
      <Loader2 className="size-4 animate-spin" />
      Проверка сессии...
    </div>
  );
}

