"use client"

import { BarChart3Icon, CircleDollarSignIcon, UserCheck2Icon, UsersIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

function formatPeopleCount(value: number) {
  const absolute = Math.abs(value)
  const mod10 = absolute % 10
  const mod100 = absolute % 100

  if (mod10 === 1 && mod100 !== 11) {
    return `${value} человек`
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${value} человека`
  }

  return `${value} человек`
}

function IconContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-card border border-border/70 bg-background/50">
      {children}
    </div>
  )
}

export function ReferralAnalyticsDrawer({
  payout,
  referralStats,
}: {
  payout: {
    totalPaidOutCredits: number
  }
  referralStats: {
    confirmedInvitedCount: number
    conversionRatePct: number
    totalEarnedCredits: number
    totalInvitedCount: number
  }
}) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className="h-button w-full px-button-x" radius="card" type="button" variant="outline">
          <BarChart3Icon className="size-4" />
          Детальная аналитика
        </Button>
      </DrawerTrigger>

      <DrawerContent className="before:shadow-none">
        <DrawerHeader className="text-left">
          <DrawerTitle>Детальная аналитика</DrawerTitle>
          <DrawerDescription>Метрики приглашений и выплат.</DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[68svh] overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-card border border-border/70 bg-card/40 p-3">
              <div className="flex items-center gap-3">
                <IconContainer>
                  <UsersIcon className="size-4 text-muted-foreground" />
                </IconContainer>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Приглашено</p>
                  <p className="mt-1 text-sm font-medium">
                    {formatPeopleCount(referralStats.totalInvitedCount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-card border border-border/70 bg-card/40 p-3">
              <div className="flex items-center gap-3">
                <IconContainer>
                  <UserCheck2Icon className="size-4 text-muted-foreground" />
                </IconContainer>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Активных</p>
                  <p className="mt-1 text-sm font-medium">
                    {formatPeopleCount(referralStats.confirmedInvitedCount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-card border border-border/70 bg-card/40 p-3">
              <div className="flex items-center gap-3">
                <IconContainer>
                  <CircleDollarSignIcon className="size-4 text-muted-foreground" />
                </IconContainer>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Заработано</p>
                  <p className="mt-1 text-sm font-medium">{referralStats.totalEarnedCredits} credits</p>
                </div>
              </div>
            </div>

            <div className="rounded-card border border-border/70 bg-card/40 p-3">
              <div className="flex items-center gap-3">
                <IconContainer>
                  <CircleDollarSignIcon className="size-4 text-muted-foreground" />
                </IconContainer>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Выплачено</p>
                  <p className="mt-1 text-sm font-medium">{payout.totalPaidOutCredits} credits</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
