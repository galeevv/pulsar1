import { BanknoteArrowDownIcon, UsersIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function formatDate(value: Date) {
  return value.toLocaleDateString("ru-RU")
}

function mapPayoutStatusLabel(status: "APPROVED" | "CANCELED" | "PAID" | "PENDING" | "REJECTED") {
  if (status === "PENDING") {
    return "На проверке"
  }
  if (status === "APPROVED") {
    return "Одобрена"
  }
  if (status === "PAID") {
    return "Выплачена"
  }
  if (status === "REJECTED") {
    return "Отклонена"
  }

  return "Отменена"
}

function mapPayoutStatusVariant(status: "APPROVED" | "CANCELED" | "PAID" | "PENDING" | "REJECTED") {
  if (status === "PENDING") {
    return "warning" as const
  }
  if (status === "APPROVED") {
    return "success" as const
  }
  if (status === "PAID") {
    return "secondary" as const
  }
  return "destructive" as const
}

export function ReferralHistoryList({
  payouts,
  rewards,
}: {
  payouts: Array<{
    amountCredits: number
    amountRub: number
    createdAt: Date
    id: string
    rejectionReason: string | null
    status: "APPROVED" | "CANCELED" | "PAID" | "PENDING" | "REJECTED"
  }>
  rewards: Array<{
    createdAt: Date
    id: string
    referredUsername: string
    rewardCreditsSnapshot: number
    rewardGrantedAt: Date | null
  }>
}) {
  return (
    <div className="flex flex-col gap-3">
      <Card className="border-border/70 bg-card/40">
        <CardHeader className="p-4">
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <UsersIcon className="size-4 text-muted-foreground" />
            Rewards history
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0">
          {rewards.length ? (
            rewards.map((event) => (
              <div
                className="rounded-card border border-border/70 bg-background/40 p-3"
                key={event.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{event.referredUsername}</p>
                  <Badge variant={event.rewardGrantedAt ? "success" : "warning"}>
                    {event.rewardGrantedAt ? "Начислено" : "Ожидает"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Дата: {formatDate(event.createdAt)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Награда: {event.rewardCreditsSnapshot} credits
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-card border border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">
              Пока нет активности по приглашениям.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/40">
        <CardHeader className="p-4">
          <CardTitle className="inline-flex items-center gap-2 text-base">
            <BanknoteArrowDownIcon className="size-4 text-muted-foreground" />
            Payout history
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0">
          {payouts.length ? (
            payouts.map((item) => (
              <div className="rounded-card border border-border/70 bg-background/40 p-3" key={item.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{item.amountRub} ₽</p>
                  <Badge variant={mapPayoutStatusVariant(item.status)}>
                    {mapPayoutStatusLabel(item.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Дата: {formatDate(item.createdAt)}</p>
                {item.rejectionReason ? (
                  <p className="mt-1 text-xs text-destructive">{item.rejectionReason}</p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="rounded-card border border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">
              Заявок на вывод пока нет.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
