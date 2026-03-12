import { Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AppUserAgreementDialog({
  userAgreementText,
}: {
  userAgreementText: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-button w-full px-button-x" radius="card" type="button" variant="outline">
          <Scale className="size-4" />
          Пользовательское соглашение
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[88svh] overflow-hidden p-4 sm:max-h-[92svh] sm:max-w-3xl sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle>Пользовательское соглашение</DialogTitle>
          <DialogDescription>Актуальные условия использования сервиса Pulsar.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[56svh] rounded-card border border-border/70 bg-card/40 p-card-compact sm:h-[62svh] md:h-[560px] md:p-card-compact-md">
          <article className="whitespace-pre-line text-sm leading-7 text-foreground md:text-base">
            {userAgreementText}
          </article>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
