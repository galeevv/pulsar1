import { DeviceListItem } from "@/components/app/device-list-item"

type DeviceSlotItem = {
  configUrl: string | null
  deviceOs: "ANDROID" | "IOS" | "MACOS" | "UNKNOWN" | "WINDOWS"
  id: string
  lastSyncError: string | null
  slotIndex: number
  status: "ACTIVE" | "BLOCKED" | "FREE"
}

export function DeviceList({
  slots,
  subscriptionUrl,
}: {
  slots: DeviceSlotItem[]
  subscriptionUrl: string | null
}) {
  return (
    <div className="flex flex-col gap-2">
      {slots.map((slot) => (
        <DeviceListItem key={slot.id} slot={slot} subscriptionUrl={subscriptionUrl} />
      ))}
    </div>
  )
}
