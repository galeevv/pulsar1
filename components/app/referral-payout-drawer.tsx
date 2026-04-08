"use client"

import { BanknoteArrowDownIcon } from "lucide-react"

import {
  CancelPayoutRequestForm,
  CreatePayoutRequestForm,
} from "@/components/app/app-dashboard-dialog-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

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

export function ReferralPayoutDrawer({
  payout,
}: {
  payout: {
    activeRequest: {
      amountCredits: number
      amountRub: number
      createdAt: Date
      id: string
      status: "APPROVED" | "CANCELED" | "PAID" | "PENDING" | "REJECTED"
    } | null
    availableCredits: number
    minimumPayoutCredits: number
    reservedCredits: number
    totalPaidOutCredits: number
  }
}) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className="h-button w-full px-button-x" radius="card" type="button" variant="outline">
          <BanknoteArrowDownIcon className="size-4" />
          Вывести
        </Button>
      </DrawerTrigger>

      <DrawerContent className="before:shadow-none">
        <DrawerHeader className="text-left">
          <DrawerTitle>Вывести</DrawerTitle>
          <DrawerDescription>Создайте заявку на вывод кредитов.</DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[68svh] overflow-y-auto px-4 pb-4">
          <div className="space-y-3">
            <div className="rounded-card border border-border/70 bg-card/40 p-3">
              <div className="flex items-center gap-3">
                <IconContainer>
                  <BanknoteArrowDownIcon className="size-4 text-muted-foreground" />
                </IconContainer>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Доступно: {payout.availableCredits} credits</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Минимум: {payout.minimumPayoutCredits} credits
                  </p>
                </div>
              </div>
            </div>

            {payout.activeRequest ? (
              <div className="rounded-card border border-border/70 bg-card/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Активная заявка</p>
                  <Badge variant={mapPayoutStatusVariant(payout.activeRequest.status)}>
                    {mapPayoutStatusLabel(payout.activeRequest.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {payout.activeRequest.amountRub} ₽ / {payout.activeRequest.amountCredits} credits
                </p>
                {payout.activeRequest.status === "PENDING" ? (
                  <CancelPayoutRequestForm payoutRequestId={payout.activeRequest.id} />
                ) : null}
              </div>
            ) : (
              <div className="rounded-card border border-border/70 bg-card/40 p-3">
                <CreatePayoutRequestForm minimumPayoutCredits={payout.minimumPayoutCredits} />
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
