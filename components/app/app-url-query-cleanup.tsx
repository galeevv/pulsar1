"use client";

import { useEffect } from "react";

export function AppUrlQueryCleanup({
  clearDialogQuery,
  clearOpenSetupQuery,
}: {
  clearDialogQuery: boolean;
  clearOpenSetupQuery: boolean;
}) {
  useEffect(() => {
    if (!clearDialogQuery && !clearOpenSetupQuery) {
      return;
    }

    const url = new URL(window.location.href);
    let hasChanges = false;

    if (clearDialogQuery && url.searchParams.has("dialog")) {
      url.searchParams.delete("dialog");
      hasChanges = true;
    }

    if (clearOpenSetupQuery && url.searchParams.has("openSetup")) {
      url.searchParams.delete("openSetup");
      hasChanges = true;
    }

    if (!hasChanges) {
      return;
    }

    const nextQuery = url.searchParams.toString();
    const nextUrl = `${url.pathname}${nextQuery ? `?${nextQuery}` : ""}${url.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [clearDialogQuery, clearOpenSetupQuery]);

  return null;
}
