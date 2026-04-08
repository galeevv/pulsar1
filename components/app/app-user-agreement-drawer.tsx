"use client"

import { useState } from "react"
import { File } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { LegalDocuments } from "@/lib/legal-documents"

type LegalTab = "agreement" | "offer" | "privacy"

export function AppUserAgreementDrawer({
  legalDocuments,
}: {
  legalDocuments: LegalDocuments
}) {
  const [activeTab, setActiveTab] = useState<LegalTab>("agreement")
  const mobileLabelByTab: Record<LegalTab, string> = {
    agreement: "Соглашение",
    offer: "Оферта",
    privacy: "Конфиденциальность",
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className="h-button w-full px-button-x" radius="card" type="button" variant="outline">
          <File className="size-4" />
          Юридическая информация
        </Button>
      </DrawerTrigger>

      <DrawerContent className="before:shadow-none">
        <DrawerHeader className="text-left">
          <DrawerTitle>Юридическая информация</DrawerTitle>
          <DrawerDescription>Выберите документ на вкладке ниже.</DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[68svh] overflow-y-auto px-4 pb-4">
          <Tabs
            className="gap-4"
            defaultValue="agreement"
            onValueChange={(value) => setActiveTab(value as LegalTab)}
            value={activeTab}
          >
            <div className="md:hidden">
              <Select onValueChange={(value) => setActiveTab(value as LegalTab)} value={activeTab}>
                <SelectTrigger className="h-11 w-full rounded-card border border-border bg-background/40">
                  <SelectValue aria-label={mobileLabelByTab[activeTab]} placeholder="Выберите документ" />
                </SelectTrigger>
                <SelectContent
                  align="start"
                  className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]"
                  position="popper"
                >
                  <SelectItem value="agreement">Соглашение</SelectItem>
                  <SelectItem value="offer">Оферта</SelectItem>
                  <SelectItem value="privacy">Конфиденциальность</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsList
              className="hidden h-11 w-full grid-cols-3 rounded-card border border-border bg-background/40 p-0 md:grid"
              variant="default"
            >
              <TabsTrigger value="agreement">Соглашение</TabsTrigger>
              <TabsTrigger value="offer">Оферта</TabsTrigger>
              <TabsTrigger value="privacy">Конфиденциальность</TabsTrigger>
            </TabsList>

            <TabsContent className="mt-0" value="agreement">
              <ScrollArea className="h-[52svh] rounded-card border border-border/70 bg-card/40 p-card-compact md:p-card-compact-md">
                <article className="whitespace-pre-line text-sm leading-7 text-foreground md:text-base">
                  {legalDocuments.userAgreementText}
                </article>
              </ScrollArea>
            </TabsContent>

            <TabsContent className="mt-0" value="offer">
              <ScrollArea className="h-[52svh] rounded-card border border-border/70 bg-card/40 p-card-compact md:p-card-compact-md">
                <article className="whitespace-pre-line text-sm leading-7 text-foreground md:text-base">
                  {legalDocuments.publicOfferText}
                </article>
              </ScrollArea>
            </TabsContent>

            <TabsContent className="mt-0" value="privacy">
              <ScrollArea className="h-[52svh] rounded-card border border-border/70 bg-card/40 p-card-compact md:p-card-compact-md">
                <article className="whitespace-pre-line text-sm leading-7 text-foreground md:text-base">
                  {legalDocuments.privacyPolicyText}
                </article>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
