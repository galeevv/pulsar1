"use client";

import { useState } from "react";
import { File } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LegalDocuments } from "@/lib/legal-documents";

type LegalTab = "agreement" | "offer" | "privacy";

export function AppUserAgreementDialog({
  legalDocuments,
}: {
  legalDocuments: LegalDocuments;
}) {
  const [activeTab, setActiveTab] = useState<LegalTab>("agreement");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-button w-full px-button-x" radius="card" type="button" variant="outline">
          <File className="size-4" />
          Юридическая информация
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[88svh] overflow-hidden p-4 sm:max-h-[92svh] sm:max-w-3xl sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle>Юридическая информация</DialogTitle>
          <DialogDescription>Выберите документ на вкладке ниже.</DialogDescription>
        </DialogHeader>

        <Tabs
          className="gap-4"
          defaultValue="agreement"
          onValueChange={(value) => setActiveTab(value as LegalTab)}
          value={activeTab}
        >
          <div className="md:hidden">
            <Select onValueChange={(value) => setActiveTab(value as LegalTab)} value={activeTab}>
              <SelectTrigger className="h-11 w-full rounded-card border border-border bg-background/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agreement">Пользовательское соглашение</SelectItem>
                <SelectItem value="offer">Публичная оферта</SelectItem>
                <SelectItem value="privacy">Политика конфиденциальности</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsList
            className="hidden h-11 w-full grid-cols-3 rounded-card border border-border bg-background/40 p-0 md:grid"
            variant="default"
          >
            <TabsTrigger value="agreement">Пользовательское соглашение</TabsTrigger>
            <TabsTrigger value="offer">Публичная оферта</TabsTrigger>
            <TabsTrigger value="privacy">Политика конфиденциальности</TabsTrigger>
          </TabsList>

          <TabsContent className="mt-0" value="agreement">
            <ScrollArea className="h-[56svh] rounded-card border border-border/70 bg-card/40 p-card-compact sm:h-[62svh] md:h-[560px] md:p-card-compact-md">
              <article className="whitespace-pre-line text-sm leading-7 text-foreground md:text-base">
                {legalDocuments.userAgreementText}
              </article>
            </ScrollArea>
          </TabsContent>

          <TabsContent className="mt-0" value="offer">
            <ScrollArea className="h-[56svh] rounded-card border border-border/70 bg-card/40 p-card-compact sm:h-[62svh] md:h-[560px] md:p-card-compact-md">
              <article className="whitespace-pre-line text-sm leading-7 text-foreground md:text-base">
                {legalDocuments.publicOfferText}
              </article>
            </ScrollArea>
          </TabsContent>

          <TabsContent className="mt-0" value="privacy">
            <ScrollArea className="h-[56svh] rounded-card border border-border/70 bg-card/40 p-card-compact sm:h-[62svh] md:h-[560px] md:p-card-compact-md">
              <article className="whitespace-pre-line text-sm leading-7 text-foreground md:text-base">
                {legalDocuments.privacyPolicyText}
              </article>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
