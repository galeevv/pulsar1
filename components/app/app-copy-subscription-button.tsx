"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

function formatSubscriptionUrlForDisplay(url: string | null, tokenLength: number) {
  if (!url) {
    return "Ссылка пока недоступна";
  }

  const marker = "/sub/";
  const markerIndex = url.indexOf(marker);

  if (markerIndex === -1) {
    return url.length > tokenLength + 24 ? `${url.slice(0, tokenLength + 24)}...` : url;
  }

  const tokenStart = markerIndex + marker.length;
  const token = url.slice(tokenStart);

  if (token.length <= tokenLength) {
    return url;
  }

  return `${url.slice(0, tokenStart)}${token.slice(0, tokenLength)}...`;
}

export function AppCopySubscriptionButton({
  subscriptionUrl,
}: {
  subscriptionUrl: string | null;
}) {
  const displayUrlMobile = formatSubscriptionUrlForDisplay(subscriptionUrl, 2);
  const displayUrlDesktop = formatSubscriptionUrlForDisplay(subscriptionUrl, 20);

  async function handleCopy() {
    if (!subscriptionUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(subscriptionUrl);
      toast.success("Ссылка подписки скопирована.", { position: "bottom-right" });
    } catch {
      toast.error("Не удалось скопировать ссылку.", { position: "bottom-right" });
    }
  }

  return (
    <Button
      className="h-button w-full min-w-0 justify-between overflow-hidden px-button-x"
      disabled={!subscriptionUrl}
      onClick={handleCopy}
      radius="card"
      type="button"
      variant="outline"
    >
      <span className="min-w-0 flex-1 truncate text-left sm:hidden">
        {displayUrlMobile}
      </span>
      <span className="hidden min-w-0 flex-1 truncate text-left sm:block">
        {displayUrlDesktop}
      </span>
      <Copy className="size-4 shrink-0" />
    </Button>
  );
}
