import Image from "next/image"

import { Card, CardContent, CardTitle } from "@/components/ui/card"

export function StatusHeroCard({
  balanceCredits,
  statusLabel,
  children,
}: {
  balanceCredits: number
  children: React.ReactNode
  statusLabel: string
}) {
  return (
    <Card className="gap-0 overflow-hidden border-border/70 bg-card/40 py-0">
      <div className="relative aspect-[16/9] w-full border-b border-border/70 bg-transparent">
        <Image
          alt="PulsarVPN"
          className="object-contain p-4"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 460px"
          src="/hero/pulsar.gif"
          unoptimized
        />
      </div>
      <CardContent className="space-y-4 p-4">
        <CardTitle className="text-lg">PulsarVPN</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-card border border-border/70 bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Баланс кредитов</p>
            <p className="mt-1 text-base font-semibold">{balanceCredits}</p>
          </div>
          <div className="rounded-card border border-border/70 bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Статус подписки</p>
            <p className="mt-1 text-base font-semibold">{statusLabel}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

