"use client"

import { useState } from "react"
import { Loader2Icon, PlugZapIcon } from "lucide-react"
import { useFormStatus } from "react-dom"

import { activateDeviceSlotAction } from "@/app/app/actions"
import {
  detectSelectableDeviceOsFromNavigator,
  DEVICE_OS_SELECTABLE_VALUES,
  getDeviceOsLabel,
  parseSelectableDeviceOsValue,
  type SelectableDeviceOsValue,
} from "@/lib/device-os"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { FormSubmitButton } from "./form-submit-button"

function ActivateSlotFields({
  deviceOs,
  onDeviceOsChange,
}: {
  deviceOs: SelectableDeviceOsValue
  onDeviceOsChange: (value: SelectableDeviceOsValue) => void
}) {
  const { pending } = useFormStatus()

  return (
    <div className="space-y-2">
      <input name="deviceOs" type="hidden" value={deviceOs} />
      <Select
        disabled={pending}
        onValueChange={(value) =>
          onDeviceOsChange(parseSelectableDeviceOsValue(value, "WINDOWS") ?? "WINDOWS")
        }
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

      <FormSubmitButton
        className="h-button w-full px-button-x"
        pendingLabel={
          <span className="inline-flex items-center gap-2">
            <Loader2Icon className="size-4 animate-spin" />
            Подключаем...
          </span>
        }
        radius="card"
        type="submit"
      >
        <PlugZapIcon className="size-4" />
        Подключить устройство
      </FormSubmitButton>
    </div>
  )
}

export function DeviceSlotActivateForm({
  initialDeviceOs = "WINDOWS",
  slotId,
}: {
  initialDeviceOs?: string
  slotId: string
}) {
  const [deviceOs, setDeviceOs] = useState<SelectableDeviceOsValue>(() => {
    const parsed = parseSelectableDeviceOsValue(initialDeviceOs, null)
    if (parsed) {
      return parsed
    }

    if (typeof window === "undefined") {
      return "WINDOWS"
    }

    return detectSelectableDeviceOsFromNavigator("WINDOWS")
  })

  return (
    <form action={activateDeviceSlotAction}>
      <input name="slotId" type="hidden" value={slotId} />
      <ActivateSlotFields deviceOs={deviceOs} onDeviceOsChange={setDeviceOs} />
    </form>
  )
}
