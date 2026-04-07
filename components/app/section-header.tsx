import { cn } from "@/lib/utils"

export function SectionHeader({
  title,
  description,
  className,
}: {
  title: string
  description?: string
  className?: string
}) {
  return (
    <header className={cn("space-y-2", className)}>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </header>
  )
}
