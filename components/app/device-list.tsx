import { DeviceListItem } from "@/components/app/device-list-item"

type DeviceSlotItem = {
  configUrl: string | null
  id: string
  label: string | null
  lastSyncError: string | null
  slotIndex: number
  status: "ACTIVE" | "BLOCKED" | "FREE"
}

export function DeviceList({ slots }: { slots: DeviceSlotItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      {slots.map((slot) => (
        <DeviceListItem key={slot.id} slot={slot} />
      ))}
    </div>
  )
}
