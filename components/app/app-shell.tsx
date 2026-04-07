import type { AppTab } from "@/lib/app-tabs"

import { BottomTabBar } from "./bottom-tab-bar"

export function AppShell({
  activeTab,
  children,
}: {
  activeTab: AppTab
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[460px] px-4 pb-[calc(env(safe-area-inset-bottom)+104px)] pt-4">
        <div className="flex flex-col gap-4 pb-6">{children}</div>
      </div>
      <BottomTabBar activeTab={activeTab} />
    </div>
  )
}
