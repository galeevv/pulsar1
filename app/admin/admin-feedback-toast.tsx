"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { toast } from "sonner";

function decodeSearchParam(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function AdminFeedbackToast({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  const searchParams = useSearchParams();
  const shownRef = useRef<string | null>(null);
  const resolvedNotice = notice ?? decodeSearchParam(searchParams.get("notice"));
  const resolvedError = error ?? decodeSearchParam(searchParams.get("error"));

  useEffect(() => {
    if (resolvedNotice && shownRef.current !== `notice:${resolvedNotice}`) {
      shownRef.current = `notice:${resolvedNotice}`;
      toast.success(resolvedNotice, { position: "bottom-right" });
      return;
    }

    if (resolvedError && shownRef.current !== `error:${resolvedError}`) {
      shownRef.current = `error:${resolvedError}`;
      toast.error(resolvedError, { position: "bottom-right" });
    }
  }, [resolvedError, resolvedNotice]);

  return null;
}
