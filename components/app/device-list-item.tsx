import { Link2Icon, RefreshCwIcon } from "lucide-react"

import { reissueDeviceSlotLinkAction, retrySlotSyncAction, syncOwnSubscriptionAction } from "@/app/app/actions"
import { DeviceSlotCopyIconButton } from "@/components/app/device-slot-copy-icon-button"
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
  void slot
  return "Подписка"
}

export function DeviceListItem({
  slot,
  subscriptionUrl,
}: {
  slot: DeviceSlotItem
  subscriptionUrl: string | null
}) {
  const slotTitle = getSlotTitle(slot)
  const effectiveSubscriptionUrl = subscriptionUrl ?? slot.configUrl
  const compactSlotUrl = formatCompactSlotUrl(effectiveSubscriptionUrl)

  return (
    <Card className="gap-0 border-border/70 bg-card/40 py-0">
      <CardContent className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-card border border-border bg-background/60">
              <Link2Icon className="size-4 text-muted-foreground" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{slotTitle}</p>
              <p className="truncate text-xs text-muted-foreground">{compactSlotUrl}</p>
            </div>
          </div>

          <div className="inline-flex shrink-0 items-center gap-2">
            <DeviceSlotCopyIconButton subscriptionUrl={effectiveSubscriptionUrl} />

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

        {slot.status !== "BLOCKED" && slot.lastSyncError ? (
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

        {slot.status !== "BLOCKED" && !effectiveSubscriptionUrl ? (
          <form action={syncOwnSubscriptionAction}>
            <FormSubmitButton
              className="h-button w-full px-button-x"
              pendingLabel="Синхронизируем..."
              radius="card"
              type="submit"
              variant="outline"
            >
              <RefreshCwIcon className="size-4" />
              Синхронизировать
            </FormSubmitButton>
          </form>
        ) : null}
      </CardContent>
    </Card>
  )
}
