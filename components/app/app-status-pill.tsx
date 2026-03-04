export function AppStatusPill({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : "border-border bg-background/60 text-foreground";

  return (
    <span
      className={`inline-flex h-8 items-center rounded-pill border px-3 text-xs font-medium tracking-wide ${toneClass}`}
    >
      {label}
    </span>
  );
}
