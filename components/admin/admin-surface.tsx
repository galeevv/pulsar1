import { cn } from "@/lib/utils";

export function AdminSurface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-panel border border-border/70 bg-card/55 p-card shadow-[0_1px_0_0_hsl(var(--border)/0.25)_inset,0_24px_48px_-42px_rgba(0,0,0,0.95)] backdrop-blur-sm md:p-card-md",
        className
      )}
    >
      {children}
    </div>
  );
}
