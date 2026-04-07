"use client"

import { useMemo } from "react"

import { CopyIcon, Share2Icon, TicketIcon } from "lucide-react"
import { toast } from "sonner"

import { GenerateReferralCodeForm } from "@/components/app/app-dashboard-dialog-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function buildReferralLink(code: string | null) {
  if (!code) {
    return ""
  }

  if (typeof window === "undefined") {
    return `/login?mode=register&code=${encodeURIComponent(code)}`
  }

  const url = new URL("/login", window.location.origin)
  url.searchParams.set("mode", "register")
  url.searchParams.set("code", code)
  return url.toString()
}

export function ReferralSummaryCard({
  canGenerateReferralCode,
  discountPct,
  hasApprovedPayment,
  isReferralEnabled,
  ownReferralCode,
  rewardCredits,
  usesCount,
}: {
  canGenerateReferralCode: boolean
  discountPct: number
  hasApprovedPayment: boolean
  isReferralEnabled: boolean
  ownReferralCode: string | null
  rewardCredits: number
  usesCount: number
}) {
  const referralLink = useMemo(() => buildReferralLink(ownReferralCode), [ownReferralCode])

  async function handleCopy(value: string, successMessage: string) {
    if (!value) {
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      toast.success(successMessage)
    } catch {
      toast.error("Не удалось скопировать значение.")
    }
  }

  async function handleShare() {
    if (!referralLink) {
      return
    }

    if (navigator.share) {
      try {
        await navigator.share({
          text: "Подключайся к PulsarVPN по моей ссылке.",
          title: "PulsarVPN",
          url: referralLink,
        })
        return
      } catch {
        // Fallback to copy for cancelled/unsupported share attempts.
      }
    }

    await handleCopy(referralLink, "Реферальная ссылка скопирована.")
  }

  return (
    <Card className="border-border/70 bg-card/40">
      <CardHeader className="space-y-2 p-4">
        <CardTitle className="inline-flex items-center gap-2 text-base">
          <TicketIcon className="size-4 text-muted-foreground" />
          Реферальный код
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Друг получает скидку {discountPct}%, вы получаете {rewardCredits} credits за подтвержденную оплату.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {ownReferralCode ? (
          <>
            <div className="rounded-card border border-border/70 bg-background/40 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">Код</span>
                <Badge variant="secondary">Использований: {usesCount}</Badge>
              </div>
              <Input readOnly value={ownReferralCode} />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button onClick={() => void handleCopy(ownReferralCode, "Код скопирован.")} radius="card" variant="outline">
                  <CopyIcon data-icon="inline-start" />
                  Копировать код
                </Button>
                <Button onClick={handleShare} radius="card" variant="outline">
                  <Share2Icon data-icon="inline-start" />
                  Поделиться
                </Button>
              </div>
            </div>
            <div className="rounded-card border border-border/70 bg-background/40 p-3">
              <p className="mb-2 text-xs text-muted-foreground">Ссылка</p>
              <Input readOnly value={referralLink} />
              <Button
                className="mt-2 w-full"
                onClick={() => void handleCopy(referralLink, "Ссылка скопирована.")}
                radius="card"
                variant="outline"
              >
                <CopyIcon data-icon="inline-start" />
                Копировать ссылку
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3 rounded-card border border-border/70 bg-background/40 p-3">
            <p className="text-sm text-muted-foreground">
              {isReferralEnabled
                ? hasApprovedPayment
                  ? "Сгенерируйте персональный код, чтобы приглашать друзей."
                  : "Код станет доступен после первой подтвержденной оплаты."
                : "Реферальная программа сейчас отключена."}
            </p>
            <GenerateReferralCodeForm canGenerate={canGenerateReferralCode} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
