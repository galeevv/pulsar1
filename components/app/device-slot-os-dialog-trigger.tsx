"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AppleIcon, LaptopIcon, Loader2Icon, MonitorIcon, SmartphoneIcon } from "lucide-react"
import { toast } from "sonner"

import { updateDeviceSlotOsInlineAction } from "@/app/app/actions"
import {
  detectSelectableDeviceOsFromNavigator,
  DEVICE_OS_SELECTABLE_VALUES,
  getDeviceOsLabel,
  parseSelectableDeviceOsValue,
  type SelectableDeviceOsValue,
} from "@/lib/device-os"
import { Button } from "@/components/ui/button"
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function resolveInitialSelectableOs(
  initialDeviceOs: "ANDROID" | "IOS" | "MACOS" | "UNKNOWN" | "WINDOWS"
): SelectableDeviceOsValue {
  const parsed = parseSelectableDeviceOsValue(initialDeviceOs, null)
  if (parsed) {
    return parsed
  }

  if (typeof window === "undefined") {
    return "WINDOWS"
  }

  return detectSelectableDeviceOsFromNavigator("WINDOWS")
}

function renderDeviceOsIcon(deviceOs: "ANDROID" | "IOS" | "MACOS" | "UNKNOWN" | "WINDOWS") {
  if (deviceOs === "ANDROID") {
    return <SmartphoneIcon className="size-5" />
  }

  if (deviceOs === "IOS") {
    return <AppleIcon className="size-5" />
  }

  if (deviceOs === "MACOS") {
    return <LaptopIcon className="size-5" />
  }

  if (deviceOs === "WINDOWS") {
    return <MonitorIcon className="size-5" />
  }

  return <SmartphoneIcon className="size-5" />
}

export function DeviceSlotOsDialogTrigger({
  disabled = false,
  initialDeviceOs,
  slotId,
}: {
  disabled?: boolean
  initialDeviceOs: "ANDROID" | "IOS" | "MACOS" | "UNKNOWN" | "WINDOWS"
  slotId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSaving, startSavingTransition] = useTransition()
  const [deviceOs, setDeviceOs] = useState<SelectableDeviceOsValue>(() =>
    resolveInitialSelectableOs(initialDeviceOs)
  )

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (!nextOpen) {
      return
    }

    setDeviceOs(resolveInitialSelectableOs(initialDeviceOs))
  }

  function handleSave() {
    if (isSaving || disabled) {
      return
    }

    startSavingTransition(async () => {
      const result = await updateDeviceSlotOsInlineAction({
        deviceOs,
        slotId,
      })

      if (!result.ok) {
        toast.error(result.message, { position: "top-right" })
        return
      }

      toast.success(result.message, { position: "top-right" })
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button
          aria-label="Изменить ОС устройства"
          className="border-border/70 bg-background/50"
          disabled={disabled}
          radius="card"
          size="icon-lg"
          type="button"
          variant="outline"
        >
          {renderDeviceOsIcon(initialDeviceOs)}
          <span className="sr-only">Изменить ОС устройства</span>
        </Button>
      </DialogTrigger>

      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Операционная система</DialogTitle>
          <DialogDescription>Выберите ОС для этого слота.</DialogDescription>
        </DialogHeader>

        <Select
          disabled={isSaving}
          onValueChange={(value) =>
            setDeviceOs(parseSelectableDeviceOsValue(value, "WINDOWS") ?? "WINDOWS")
          }
          value={deviceOs}
        >
          <SelectTrigger className="h-10 w-full rounded-card border-border/70 bg-background/40">
            <SelectValue placeholder="Выберите ОС" />
          </SelectTrigger>
          <SelectContent align="start" position="popper">
            <SelectGroup>
              {DEVICE_OS_SELECTABLE_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {getDeviceOsLabel(value)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <DialogFooter>
          <DialogClose asChild>
            <Button className="h-button w-full px-button-x sm:w-auto" radius="card" variant="outline">
              Отменить
            </Button>
          </DialogClose>
          <Button
            className="h-button w-full px-button-x sm:w-auto"
            disabled={isSaving}
            onClick={handleSave}
            radius="card"
            type="button"
          >
            {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
