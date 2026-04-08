import { BanknoteArrowDownIcon, UserIcon, UsersIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"

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
  if (status === "APPROVED" || status === "PAID") {
    return "success" as const
  }
  return "destructive" as const
}

function IconContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-card border border-border/70 bg-background/50">
      {children}
    </div>
  )
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
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-medium">
          <UsersIcon className="size-4 text-muted-foreground" />
          Приглашённые пользователи
        </p>

        {rewards.length ? (
          rewards.map((event) => (
            <div className="rounded-card border border-border/70 bg-card/40 p-3" key={event.id}>
              <div className="flex items-center gap-3">
                <IconContainer>
                  <UserIcon className="size-4 text-muted-foreground" />
                </IconContainer>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.referredUsername}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Награда: {event.rewardCreditsSnapshot} credits
                  </p>
                </div>

                <Badge className="shrink-0" variant={event.rewardGrantedAt ? "success" : "warning"}>
                  {event.rewardGrantedAt ? "Начислено" : "Ожидает"}
                </Badge>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-card border border-border/70 bg-card/40 p-3 text-sm text-muted-foreground">
            Пока нет активности по приглашениям.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-medium">
          <BanknoteArrowDownIcon className="size-4 text-muted-foreground" />
          Заявки на вывод
        </p>

        {payouts.length ? (
          payouts.map((item) => (
            <div className="rounded-card border border-border/70 bg-card/40 p-3" key={item.id}>
              <div className="flex items-center gap-3">
                <IconContainer>
                  <BanknoteArrowDownIcon className="size-4 text-muted-foreground" />
                </IconContainer>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.amountRub} ₽</p>
                  <p className="mt-1 text-sm text-muted-foreground">Дата: {formatDate(item.createdAt)}</p>
                </div>

                <Badge className="shrink-0" variant={mapPayoutStatusVariant(item.status)}>
                  {mapPayoutStatusLabel(item.status)}
                </Badge>
              </div>

              {item.rejectionReason ? (
                <p className="mt-2 text-xs text-destructive">{item.rejectionReason}</p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="rounded-card border border-border/70 bg-card/40 p-3 text-sm text-muted-foreground">
            Заявок на вывод пока нет.
          </p>
        )}
      </section>
    </div>
  )
}
