import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { SerializedSupportMessage } from "@/lib/support/client-types";

import { SupportMessageItem } from "./support-message-item";

export function SupportMessageList({
  messages,
}: {
  messages: SerializedSupportMessage[];
}) {
  if (!messages.length) {
    return (
      <div className="rounded-card border border-dashed border-border bg-background/30 px-4 py-6 text-center text-sm text-muted-foreground">
        Сообщений пока нет.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[280px] rounded-card border border-border bg-background/20 p-3 md:h-[340px]">
      <div className="space-y-3">
        {messages.map((message, index) => (
          <div key={message.id}>
            <SupportMessageItem
              createdAt={message.createdAt}
              message={message.message}
              senderType={message.senderType}
            />
            {index < messages.length - 1 ? <Separator className="mt-3" /> : null}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
