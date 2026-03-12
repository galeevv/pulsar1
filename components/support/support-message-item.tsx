import type { SupportSenderType } from "@/lib/support/constants";

function formatMessageDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function SupportMessageItem({
  createdAt,
  message,
  senderType,
}: {
  createdAt: string;
  message: string;
  senderType: SupportSenderType;
}) {
  const isAdmin = senderType === "admin";

  return (
    <div className={`min-w-0 overflow-x-hidden flex ${isAdmin ? "justify-start" : "justify-end"}`}>
      <div
        className={`min-w-0 w-fit overflow-hidden max-w-[72%] rounded-card border px-3 py-2 md:max-w-[58%] lg:max-w-[34rem] ${
          isAdmin
            ? "border-border bg-background/60 text-foreground"
            : "border-primary/20 bg-primary/10 text-foreground"
        }`}
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">
            {isAdmin ? "Поддержка" : "Вы"}
          </p>
          <p className="text-xs text-muted-foreground">{formatMessageDateTime(createdAt)}</p>
        </div>
        <p className="max-w-full whitespace-pre-wrap break-all [overflow-wrap:anywhere] text-sm leading-6">
          {message}
        </p>
      </div>
    </div>
  );
}
