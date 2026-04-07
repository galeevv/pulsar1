import { CalendarClockIcon, CreditCardIcon, ShieldCheckIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function formatDate(value: Date | null) {
  if (!value) {
    return "—"
  }
  return value.toLocaleDateString("ru-RU")
}

export function SubscriptionSummaryCard({
  endAt,
  startAt,
  statusLabel,
  statusVariant,
  tariffName,
}: {
  endAt: Date | null
  startAt: Date | null
  statusLabel: string
  statusVariant: "default" | "warning" | "success"
  tariffName: string
}) {
  return (
    <Card className="border-border/70 bg-card/40">
      <CardHeader className="p-4">
        <CardTitle className="inline-flex items-center gap-2 text-base">
          <ShieldCheckIcon className="size-4 text-muted-foreground" />
          Подписка
        </CardTitle>
        <CardDescription>Ключевые параметры активного тарифа.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="flex items-center justify-between rounded-card border border-border/70 bg-background/40 p-3">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCardIcon className="size-4" />
            Тариф
          </div>
          <span className="text-sm font-medium text-foreground">{tariffName}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-card border border-border/70 bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Начало</p>
            <p className="mt-1 text-sm font-medium">{formatDate(startAt)}</p>
          </div>
          <div className="rounded-card border border-border/70 bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Окончание</p>
            <p className="mt-1 text-sm font-medium">{formatDate(endAt)}</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClockIcon className="size-4" />
          Текущее состояние:
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
