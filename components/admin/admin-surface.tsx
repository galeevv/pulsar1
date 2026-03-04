export function AdminSurface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-card border border-border/70 bg-card/40 p-card md:p-card-md ${className}`}>
      {children}
    </div>
  );
}
