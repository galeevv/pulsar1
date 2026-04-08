import { PlugZapIcon, ShieldAlertIcon, SmartphoneIcon, UnplugIcon } from "lucide-react"

import { activateDeviceSlotAction, deactivateDeviceSlotAction } from "@/app/app/actions"
import { ActionRow } from "@/components/app/action-row"
import { AppCopySubscriptionButton } from "@/components/app/app-copy-subscription-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type DeviceSlotItem = {
  configUrl: string | null
  id: string
  label: string | null
  lastSyncError: string | null
  slotIndex: number
  status: "ACTIVE" | "BLOCKED" | "FREE"
}

function getSlotStatusMeta(status: DeviceSlotItem["status"]) {
  if (status === "ACTIVE") {
    return {
      badgeVariant: "success" as const,
      label: "Активно",
    }
  }

  if (status === "BLOCKED") {
    return {
      badgeVariant: "destructive" as const,
      label: "Заблокирован",
    }
  }

  return {
    badgeVariant: "secondary" as const,
    label: "Свободно",
  }
}

export function DeviceListItem({ slot }: { slot: DeviceSlotItem }) {
  const statusMeta = getSlotStatusMeta(slot.status)
  const slotLabel =
    slot.label && slot.label.trim().length > 0 ? slot.label.trim() : `Устройство ${slot.slotIndex}`

  return (
    <Card className="gap-0 border-border/70 bg-card/40 py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="inline-flex min-w-0 items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-card border border-border/70 bg-background/50">
              <SmartphoneIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{slotLabel}</p>
              <p className="text-xs text-muted-foreground">Слот #{slot.slotIndex}</p>
            </div>
          </div>
          <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
        </div>

        {slot.lastSyncError ? (
          <Alert variant="destructive">
            <AlertTitle>Ошибка синхронизации</AlertTitle>
            <AlertDescription>{slot.lastSyncError}</AlertDescription>
          </Alert>
        ) : null}

        {slot.status === "ACTIVE" ? (
          <ActionRow>
            <AppCopySubscriptionButton subscriptionUrl={slot.configUrl} />
            <form action={deactivateDeviceSlotAction} className="w-full">
              <input name="slotId" type="hidden" value={slot.id} />
              <Button className="h-button w-full px-button-x" radius="card" type="submit" variant="outline">
                <UnplugIcon className="size-4" />
                Отключить
              </Button>
            </form>
          </ActionRow>
        ) : null}

        {slot.status === "FREE" ? (
          <form action={activateDeviceSlotAction}>
            <input name="slotId" type="hidden" value={slot.id} />
            <Button className="h-button w-full px-button-x" radius="card" type="submit">
              <PlugZapIcon className="size-4" />
              Подключить устройство
            </Button>
          </form>
        ) : null}

        {slot.status === "BLOCKED" ? (
          <Button className="h-button w-full px-button-x" disabled radius="card" type="button" variant="outline">
            <ShieldAlertIcon className="size-4" />
            Слот заблокирован
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
