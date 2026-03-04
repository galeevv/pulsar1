"use client";

import { useEffect, useRef } from "react";

import { toast } from "sonner";

export function AppFeedbackToast({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  const shownRef = useRef<string | null>(null);

  useEffect(() => {
    if (notice && shownRef.current !== `notice:${notice}`) {
      shownRef.current = `notice:${notice}`;
      toast.success(notice, { position: "bottom-right" });
      return;
    }

    if (error && shownRef.current !== `error:${error}`) {
      shownRef.current = `error:${error}`;
      toast.error(error, { position: "bottom-right" });
    }
  }, [error, notice]);

  return null;
}
