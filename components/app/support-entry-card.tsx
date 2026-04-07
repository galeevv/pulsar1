import { HeadsetIcon } from "lucide-react"

import { SupportDialog } from "@/components/support/support-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SupportEntryCard({ unavailable = false }: { unavailable?: boolean }) {
  return (
    <Card className="border-border/70 bg-card/40">
      <CardHeader className="p-4">
        <CardTitle className="inline-flex items-center gap-2 text-base">
          <HeadsetIcon className="size-4 text-muted-foreground" />
          Поддержка
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {unavailable ? (
          <Alert variant="destructive">
            <AlertTitle>Поддержка временно недоступна</AlertTitle>
            <AlertDescription>
              Попробуйте открыть тикет чуть позже.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Откройте тикет, чтобы получить ответ от команды.
            </p>
            <SupportDialog />
          </>
        )}
      </CardContent>
    </Card>
  )
}
