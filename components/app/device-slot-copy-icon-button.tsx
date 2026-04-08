"use client"

import { CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function DeviceSlotCopyIconButton({
  subscriptionUrl,
}: {
  subscriptionUrl: string | null
}) {
  async function handleCopy() {
    if (!subscriptionUrl) {
      toast.error("Ссылка подписки пока недоступна.", { position: "top-right" })
      return
    }

    try {
      await navigator.clipboard.writeText(subscriptionUrl)
      toast.success("Ссылка подписки скопирована.", { position: "top-right" })
    } catch {
      toast.error("Не удалось скопировать ссылку.", { position: "top-right" })
    }
  }

  return (
    <Button
      aria-label="Скопировать ссылку подписки"
      disabled={!subscriptionUrl}
      onClick={handleCopy}
      radius="card"
      size="icon-sm"
      type="button"
      variant="outline"
    >
      <CopyIcon className="size-4" />
      <span className="sr-only">Скопировать ссылку</span>
    </Button>
  )
}
