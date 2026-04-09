"use client"

import { useActionState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

import { CopyIcon, HandshakeIcon, TicketPercentIcon } from "lucide-react"
import { toast } from "sonner"

import { generateOwnReferralCodeInlineAction } from "@/app/app/actions"
import { Button } from "@/components/ui/button"

type InlineDialogActionState = {
  message: string
  nonce: number
  status: "error" | "idle" | "success"
}

const INLINE_DIALOG_ACTION_INITIAL_STATE: InlineDialogActionState = {
  message: "",
  nonce: 0,
  status: "idle",
}

function IconContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-card border border-border/70 bg-background/50">
      {children}
    </div>
  )
}

export function ReferralSummaryCard({
  canGenerateReferralCode,
  discountPct,
  ownReferralCode,
  rewardCredits,
  usesCount,
}: {
  canGenerateReferralCode: boolean
  discountPct: number
  ownReferralCode: string | null
  rewardCredits: number
  usesCount: number
}) {
  const router = useRouter()
  const handledNonceRef = useRef(0)
  const [state, formAction, isPending] = useActionState(
    generateOwnReferralCodeInlineAction,
    INLINE_DIALOG_ACTION_INITIAL_STATE
  )

  useEffect(() => {
    if (state.nonce === 0 || state.nonce === handledNonceRef.current) {
      return
    }

    handledNonceRef.current = state.nonce

    if (state.status === "success") {
      toast.success(state.message, { position: "top-right" })
      router.refresh()
      return
    }

    if (state.status === "error") {
      toast.error(state.message, { position: "top-right" })
    }
  }, [router, state])

  async function handleCopyCode() {
    if (!ownReferralCode) {
      return
    }

    try {
      await navigator.clipboard.writeText(ownReferralCode)
      toast.success("Код скопирован.", { position: "top-right" })
    } catch {
      toast.error("Не удалось скопировать код.", { position: "top-right" })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-card border border-border/70 bg-background/40 p-3">
        <div className="flex items-center gap-3">
          <IconContainer>
            <HandshakeIcon className="size-4 text-muted-foreground" />
          </IconContainer>
          <div className="min-w-0">
            <p className="text-sm font-medium">Другу скидка {discountPct}%</p>
            <p className="text-sm text-muted-foreground">Вам {rewardCredits} кредитов</p>
          </div>
        </div>
      </div>

      <div className="rounded-card border border-border/70 bg-background/40 p-3">
        <div className="flex items-center gap-3">
          <IconContainer>
            <TicketPercentIcon className="size-4 text-muted-foreground" />
          </IconContainer>

          {ownReferralCode ? (
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{ownReferralCode}</p>
                <p className="text-sm text-muted-foreground">
                  <span className="sm:hidden">Исп. — {usesCount}</span>
                  <span className="hidden sm:inline">Использований: {usesCount}</span>
                </p>
              </div>

              <Button
                aria-label="Скопировать реферальный код"
                className="shrink-0"
                onClick={() => void handleCopyCode()}
                radius="card"
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <CopyIcon className="size-4" />
              </Button>
            </div>
          ) : (
            <form action={formAction} className="min-w-0 flex-1">
              <Button
                className="h-button w-full px-button-x"
                disabled={!canGenerateReferralCode || isPending}
                radius="card"
                type="submit"
              >
                {isPending ? "Генерация..." : "Сгенерировать"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
