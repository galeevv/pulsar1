export function AppSectionShell({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24 py-section md:scroll-mt-28 md:py-section-md" id={id}>
      <div className="space-y-3">
        <p className="text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="text-h2 font-semibold tracking-tight">{title}</h2>
        <p className="w-full text-sm leading-7 text-muted-foreground md:text-base">
          {description}
        </p>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
