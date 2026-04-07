import Link from "next/link"

import { APP_TAB_ITEMS } from "@/components/app/app-tab-config"
import { cn } from "@/lib/utils"
import type { AppTab } from "@/lib/app-tabs"

export function BottomTabBar({ activeTab }: { activeTab: AppTab }) {
  return (
    <nav aria-label="Нижняя навигация" className="fixed inset-x-0 bottom-0 z-40 bg-transparent">
      <div className="mx-auto w-full max-w-[460px] bg-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
        <div className="grid grid-cols-4 gap-2 rounded-2xl border border-border/70 bg-background/70 p-2 backdrop-blur">
          {APP_TAB_ITEMS.map((item) => {
            const isActive = item.id === activeTab
            const Icon = item.icon

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                aria-label={item.description}
                className={cn(
                  "inline-flex min-h-12 flex-col items-center justify-center rounded-card border px-2 py-2 text-[11px] font-medium",
                  isActive
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                href={item.href}
                key={item.id}
              >
                <Icon className="mb-1 size-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
