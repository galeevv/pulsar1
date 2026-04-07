import { BadgeCheckIcon, CreditCardIcon, User2Icon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function getInitials(value: string) {
  if (!value) {
    return "PV"
  }

  return value.slice(0, 2).toUpperCase()
}

export function ProfileOverviewCard({
  credits,
  username,
}: {
  credits: number
  username: string
}) {
  return (
    <Card className="border-border/70 bg-card/40">
      <CardHeader className="p-4">
        <CardTitle className="text-base">Профиль</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="flex items-center gap-3">
          <Avatar className="size-12 rounded-card border border-border/70">
            <AvatarFallback className="rounded-card bg-background/50 text-sm font-semibold">
              {getInitials(username)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="inline-flex items-center gap-2 text-sm font-semibold">
              <User2Icon className="size-4 text-muted-foreground" />
              {username}
            </p>
            <Badge variant="secondary">USER</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-card border border-border/70 bg-background/40 p-3">
            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCardIcon className="size-4" />
              Кредиты
            </p>
            <p className="mt-1 text-sm font-semibold">{credits}</p>
          </div>
          <div className="rounded-card border border-border/70 bg-background/40 p-3">
            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <BadgeCheckIcon className="size-4" />
              Безопасность
            </p>
            <p className="mt-1 text-sm font-semibold">Нормально</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
