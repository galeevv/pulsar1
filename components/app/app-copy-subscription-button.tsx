"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function AppCopySubscriptionButton({
  subscriptionUrl,
}: {
  subscriptionUrl: string | null;
}) {
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
      className="h-button w-full min-w-0 justify-between px-button-x"
      disabled={!subscriptionUrl}
      onClick={handleCopy}
      radius="card"
      type="button"
      variant="outline"
    >
      <span className="min-w-0 flex-1 truncate text-left">
        {subscriptionUrl ?? "Ссылка пока недоступна"}
      </span>
      <Copy className="size-4 shrink-0" />
    </Button>
  );
}