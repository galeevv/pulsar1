import { RefreshCwIcon } from "lucide-react"

import { reissueDeviceSlotLinkAction, retrySlotSyncAction } from "@/app/app/actions"
import { DeviceSlotCopyIconButton } from "@/components/app/device-slot-copy-icon-button"
import { DeviceSlotOsDialogTrigger } from "@/components/app/device-slot-os-dialog-trigger"
import { FormSubmitButton } from "@/components/app/form-submit-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getDeviceOsLabel } from "@/lib/device-os"

type DeviceSlotItem = {
  configUrl: string | null
  deviceOs: "ANDROID" | "IOS" | "MACOS" | "UNKNOWN" | "WINDOWS"
  id: string
  lastSyncError: string | null
  slotIndex: number
  status: "ACTIVE" | "BLOCKED" | "FREE"
}

function formatCompactSlotUrl(url: string | null) {
  if (!url) {
    return "Ссылка недоступна"
  }

  try {
    const parsedUrl = new URL(url)
    const pathSegments = parsedUrl.pathname.split("/").filter(Boolean)
    const token = pathSegments[pathSegments.length - 1] ?? ""

    if (!token) {
      return parsedUrl.host
    }

    const tokenTail = token.slice(-4)
    return `${parsedUrl.host}/…${tokenTail}`
  } catch {
    const hostMatch = url.match(/^https?:\/\/([^/]+)/i)
    const host = hostMatch?.[1] ?? url
    const pathSegments = url.split("/").filter(Boolean)
    const token = pathSegments[pathSegments.length - 1] ?? ""
    const tokenTail = token.slice(-4)

    if (!tokenTail) {
      return host
    }

    return `${host}/…${tokenTail}`
  }
}

function getSlotTitle(slot: DeviceSlotItem) {
  const osLabel = getDeviceOsLabel(slot.deviceOs)

  if (slot.status === "FREE") {
    return `${osLabel} · Свободно`
  }

  if (slot.status === "BLOCKED") {
    return `${osLabel} · Заблокирован`
  }

  return osLabel
}

export function DeviceListItem({ slot }: { slot: DeviceSlotItem }) {
  const slotTitle = getSlotTitle(slot)
  const compactSlotUrl = formatCompactSlotUrl(slot.configUrl)

  return (
    <Card className="gap-0 border-border/70 bg-card/40 py-0">
      <CardContent className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex min-w-0 items-center gap-3">
            <DeviceSlotOsDialogTrigger
              disabled={slot.status === "BLOCKED"}
              initialDeviceOs={slot.deviceOs}
              slotId={slot.id}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{slotTitle}</p>
              <p className="truncate text-xs text-muted-foreground">{compactSlotUrl}</p>
            </div>
          </div>

          <div className="inline-flex shrink-0 items-center gap-2">
            <DeviceSlotCopyIconButton subscriptionUrl={slot.configUrl} />

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  aria-label="Перевыпустить ссылку"
                  disabled={slot.status !== "ACTIVE"}
                  radius="card"
                  size="icon-sm"
                  type="button"
                  variant="outline"
                >
                  <RefreshCwIcon className="size-4" />
                  <span className="sr-only">Перевыпустить ссылку</span>
                </Button>
              </DialogTrigger>
              <DialogContent showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle>Перевыпустить ссылку?</DialogTitle>
                  <DialogDescription>
                    Предыдущее устройство, подключённое по этой ссылке, перестанет работать.
                    Продолжить?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button className="h-button w-full px-button-x sm:w-auto" radius="card" variant="outline">
                      Отменить
                    </Button>
                  </DialogClose>
                  <form action={reissueDeviceSlotLinkAction} className="w-full sm:w-auto">
                    <input name="slotId" type="hidden" value={slot.id} />
                    <FormSubmitButton className="h-button w-full px-button-x sm:w-auto" radius="card" type="submit">
                      Продолжить
                    </FormSubmitButton>
                  </form>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {slot.lastSyncError ? (
          <Alert variant="destructive">
            <AlertTitle>Ошибка синхронизации</AlertTitle>
            <AlertDescription>{slot.lastSyncError}</AlertDescription>
          </Alert>
        ) : null}

        {slot.status === "ACTIVE" && slot.lastSyncError ? (
          <form action={retrySlotSyncAction}>
            <input name="slotId" type="hidden" value={slot.id} />
            <FormSubmitButton
              className="h-button w-full px-button-x"
              radius="card"
              type="submit"
              variant="outline"
            >
              <RefreshCwIcon className="size-4" />
              Повторить синхронизацию
            </FormSubmitButton>
          </form>
        ) : null}
      </CardContent>
    </Card>
  )
}
