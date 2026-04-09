import { cn } from "@/lib/utils"

export function ActionRow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {children}
    </div>
  )
}
