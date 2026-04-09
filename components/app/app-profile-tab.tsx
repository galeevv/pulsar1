import Image from "next/image"

import { LogOutIcon, TicketPercentIcon, UserIcon } from "lucide-react"

import { logoutAction } from "@/app/login/actions"
import { PromoCodeApplyForm } from "@/components/app/app-dashboard-dialog-actions"
import { AppUserAgreementDrawer } from "@/components/app/app-user-agreement-drawer"
import { SupportDrawer } from "@/components/support/support-drawer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { LegalDocuments } from "@/lib/legal-documents"

export function AppProfileTab({
  legalDocuments,
  username,
}: {
  legalDocuments: LegalDocuments
  username: string
}) {
  return (
    <section className="space-y-4">
      <Card className="gap-0 overflow-hidden border-border/70 bg-card/40 py-0">
        <div className="relative aspect-[16/9] w-full border-b border-border/70 bg-transparent">
          <Image
            alt="Profile visual"
            className="object-contain p-0"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 460px"
            src="/details/birth.gif"
            unoptimized
          />
        </div>

        <CardContent className="space-y-4 p-4">
          <CardTitle className="text-lg">Профиль</CardTitle>

          <div className="rounded-card border border-border/70 bg-background/40 p-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex size-10 items-center justify-center rounded-card border border-border/70 bg-background/50">
                <UserIcon className="size-4 text-muted-foreground" />
              </div>
              <p className="truncate text-sm font-medium">{username}</p>
            </div>
          </div>

          <div className="mb-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="h-button w-full px-button-x" radius="card" type="button" variant="outline">
                  <TicketPercentIcon className="size-4" />
                  Промокоды
                </Button>
              </DialogTrigger>
              <DialogContent preventAutoFocus showCloseButton={false}>
                <DialogHeader className="text-left">
                  <DialogTitle>Промокоды</DialogTitle>
                  <DialogDescription>
                    Введите промокод для пополнения баланса кредитов.
                  </DialogDescription>
                </DialogHeader>
                <PromoCodeApplyForm />
              </DialogContent>
            </Dialog>
          </div>

          <div className="mb-2">
            <SupportDrawer />
          </div>
          
          <div className="mb-2">
            <AppUserAgreementDrawer legalDocuments={legalDocuments} />
          </div>         

          <form action={logoutAction} className="w-full">
            <Button
              className="h-button w-full border-destructive px-button-x text-destructive hover:bg-destructive/10 hover:text-destructive"
              radius="card"
              type="submit"
              variant="outline"
            >
              <LogOutIcon className="size-4" />
              Выйти из аккаунта
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
