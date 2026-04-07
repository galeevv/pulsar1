import Image from "next/image"

import { LogOutIcon, TicketPercentIcon, UserIcon } from "lucide-react"

import { logoutAction } from "@/app/login/actions"
import { PromoCodeApplyForm } from "@/components/app/app-dashboard-dialog-actions"
import { AppUserAgreementDialog } from "@/components/app/app-user-agreement-dialog"
import { SupportDialog } from "@/components/support/support-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
        <div className="relative aspect-[16/9] w-full bg-transparent">
          <Image
            alt="Profile visual"
            className="object-cover"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 460px"
            src="/details/birth.gif"
            unoptimized
          />
        </div>

        <CardContent className="flex flex-col gap-3 px-3 pb-3 pt-0">
          <Card className="gap-0 border-border/70 bg-background/40 py-0">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 px-3 py-3">
                <div className="inline-flex size-10 items-center justify-center rounded-card border border-border/70 bg-background/50">
                  <UserIcon className="size-4 text-muted-foreground" />
                </div>
                <p className="truncate text-sm font-medium">{username}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 border-border/70 bg-background/40 py-0">
            <CardHeader className="p-0">
              <div className="px-3 pt-3">
                <CardTitle className="inline-flex items-center gap-2 text-sm">
                  <TicketPercentIcon className="size-4 text-muted-foreground" />
                  Промокоды
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-2 px-3 pb-3">
                <p className="text-xs text-muted-foreground">
                  Введите промокод для пополнения баланса кредитов.
                </p>
                <PromoCodeApplyForm />
              </div>
            </CardContent>
          </Card>

          <SupportDialog />
          <AppUserAgreementDialog legalDocuments={legalDocuments} />

          <form action={logoutAction} className="w-full">
            <Button className="h-button w-full px-button-x" radius="card" type="submit" variant="outline">
              <LogOutIcon data-icon="inline-start" />
              Выйти из аккаунта
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}

