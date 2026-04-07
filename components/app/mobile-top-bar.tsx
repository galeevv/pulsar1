import Link from "next/link"

import { OrbitIcon } from "lucide-react"

import { APP_TAB_ITEMS } from "@/components/app/app-tab-config"
import { Badge } from "@/components/ui/badge"
import type { AppTab } from "@/lib/app-tabs"

export function MobileTopBar({ activeTab }: { activeTab: AppTab }) {
  const activeItem = APP_TAB_ITEMS.find((item) => item.id === activeTab) ?? APP_TAB_ITEMS[0]

  return (
    <div className="sticky top-0 z-30 bg-background/90 px-4 pb-3 pt-4 backdrop-blur">
      <div className="mx-auto w-full max-w-[460px] rounded-card border border-border/70 bg-card/40 p-3">
        <div className="flex items-center justify-between gap-3">
          <Link
            aria-label="PulsarVPN"
            className="inline-flex items-center gap-2 text-foreground"
            href="/app?tab=home"
          >
            <OrbitIcon className="size-5" />
            <span className="text-sm font-semibold tracking-[0.14em] uppercase">PulsarVPN</span>
          </Link>
          <Badge variant="secondary">{activeItem.label}</Badge>
        </div>
      </div>
    </div>
  )
}
