"use client"

import { useState, useTransition } from "react"
import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import {
  reissueDeviceSlotLinkAction,
  updateDeviceSlotOsInlineAction,
} from "@/app/app/actions"
import {
  detectSelectableDeviceOsFromNavigator,
  DEVICE_OS_SELECTABLE_VALUES,
  getDeviceOsLabel,
  parseSelectableDeviceOsValue,
  type SelectableDeviceOsValue,
} from "@/lib/device-os"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { FormSubmitButton } from "./form-submit-button"

function getInitialSelectableOs(initialDeviceOs: string): SelectableDeviceOsValue {
  const parsed = parseSelectableDeviceOsValue(initialDeviceOs, null)
  if (parsed) {
    return parsed
  }

  if (typeof window === "undefined") {
    return "WINDOWS"
  }

  return detectSelectableDeviceOsFromNavigator("WINDOWS")
}

export function DeviceSlotActiveControls({
  initialDeviceOs,
  slotId,
}: {
  initialDeviceOs: "ANDROID" | "IOS" | "MACOS" | "UNKNOWN" | "WINDOWS"
  slotId: string
}) {
  const [deviceOs, setDeviceOs] = useState<SelectableDeviceOsValue>(
    () => getInitialSelectableOs(initialDeviceOs)
  )
  const [isSavingOs, startSavingOs] = useTransition()

  function handleDeviceOsChange(nextRawValue: string) {
    const nextDeviceOs = parseSelectableDeviceOsValue(nextRawValue, "WINDOWS") ?? "WINDOWS"
    const previousDeviceOs = deviceOs

    setDeviceOs(nextDeviceOs)

    startSavingOs(async () => {
      const result = await updateDeviceSlotOsInlineAction({
        deviceOs: nextDeviceOs,
        slotId,
      })

      if (!result.ok) {
        setDeviceOs(previousDeviceOs)
        toast.error(result.message, { position: "top-right" })
        return
      }

      toast.success(result.message, { position: "top-right" })
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {initialDeviceOs === "UNKNOWN" ? (
        <p className="text-xs text-muted-foreground">Текущая ОС: Неизвестно (legacy).</p>
      ) : null}

      <Select
        disabled={isSavingOs}
        onValueChange={handleDeviceOsChange}
        value={deviceOs}
      >
        <SelectTrigger className="h-10 w-full rounded-card border-border/70 bg-background/40">
          <SelectValue placeholder="Выберите ОС" />
        </SelectTrigger>
        <SelectContent align="start" position="popper">
          {DEVICE_OS_SELECTABLE_VALUES.map((value) => (
            <SelectItem key={value} value={value}>
              {getDeviceOsLabel(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="h-button w-full px-button-x" radius="card" type="button" variant="outline">
              <RotateCcwIcon className="size-4" />
              Перевыпустить ссылку
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent
            className="gap-4 rounded-4xl border border-border/70 bg-card/95 p-4 shadow-none ring-0 supports-backdrop-filter:backdrop-blur"
            size="sm"
          >
            <AlertDialogHeader className="items-start text-left">
              <AlertDialogMedia className="mb-0 size-12 bg-destructive/10 text-destructive">
                <TriangleAlertIcon />
              </AlertDialogMedia>
              <AlertDialogTitle className="text-base">Перевыпустить ссылку?</AlertDialogTitle>
              <AlertDialogDescription>
                Предыдущее устройство, подключённое по этой ссылке, перестанет работать.
                Продолжить?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="h-button w-full px-button-x sm:w-auto">Отмена</AlertDialogCancel>
              <form action={reissueDeviceSlotLinkAction} className="w-full sm:w-auto">
                <input name="deviceOs" type="hidden" value={deviceOs} />
                <input name="slotId" type="hidden" value={slotId} />
                <FormSubmitButton className="h-button w-full px-button-x" radius="card" type="submit">
                  Продолжить
                </FormSubmitButton>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
