"use client"

import { HistoryIcon } from "lucide-react"

import { ReferralHistoryList } from "@/components/app/referral-history-list"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

export function ReferralHistoryDrawer({
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
    <Drawer>
      <DrawerTrigger asChild>
        <Button className="h-button w-full px-button-x" radius="card" type="button" variant="outline">
          <HistoryIcon className="size-4" />
          История
        </Button>
      </DrawerTrigger>

      <DrawerContent className="before:shadow-none">
        <DrawerHeader className="text-left">
          <DrawerTitle>История</DrawerTitle>
          <DrawerDescription>Рефералы и выплаты.</DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[68svh] overflow-y-auto px-4 pb-4">
          <ReferralHistoryList payouts={payouts} rewards={rewards} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
