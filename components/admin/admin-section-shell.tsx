import { cn } from "@/lib/utils";

export function AdminSectionShell({
  id,
  title,
  actions,
  children,
  className,
  contentClassName,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("scroll-mt-20 py-12 md:scroll-mt-20 md:py-12", className)} id={id}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="w-full">
          <h2 className="text-h2 font-semibold tracking-tight">{title}</h2>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className={cn("mt-4", contentClassName)}>{children}</div>
    </section>
  );
}
