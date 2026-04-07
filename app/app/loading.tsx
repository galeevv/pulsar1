import { Skeleton } from "@/components/ui/skeleton"

export default function AppLoading() {
  return (
    <main className="min-h-screen bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+104px)] pt-4 text-foreground">
      <div className="mx-auto w-full max-w-[460px] space-y-4">
        <Skeleton className="h-14 w-full rounded-card" />
        <Skeleton className="h-[220px] w-full rounded-card" />
        <Skeleton className="h-[140px] w-full rounded-card" />
        <Skeleton className="h-[140px] w-full rounded-card" />
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-border/70 bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
        <div className="mx-auto grid w-full max-w-[460px] grid-cols-4 gap-2 rounded-card border border-border/70 bg-card/40 p-2">
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
          <Skeleton className="h-12 rounded-card" />
        </div>
      </div>
    </main>
  )
}
