"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type SessionDestination = "/login" | "/app" | "/admin";

const FALLBACK_DESTINATION: SessionDestination = "/login";

function isValidDestination(value: unknown): value is SessionDestination {
  return value === "/login" || value === "/app" || value === "/admin";
}

async function resolveSessionDestination(): Promise<SessionDestination> {
  try {
    const response = await fetch("/api/auth/session-destination", {
      cache: "no-store",
      method: "GET",
    });

    if (!response.ok) {
      return FALLBACK_DESTINATION;
    }

    const payload = (await response.json()) as { destination?: unknown };
    return isValidDestination(payload.destination) ? payload.destination : FALLBACK_DESTINATION;
  } catch {
    return FALLBACK_DESTINATION;
  }
}

export function useLandingLoginRedirect() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(false);

  const handleLoginClick = useCallback(async () => {
    if (isCheckingSession) {
      return;
    }

    setIsCheckingSession(true);
    const destination = await resolveSessionDestination();
    router.push(destination);
  }, [isCheckingSession, router]);

  return {
    handleLoginClick,
    isCheckingSession,
  };
}

