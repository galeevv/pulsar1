import { Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AppSectionShell } from "./app-section-shell";
import { AppStatusPill } from "./app-status-pill";
import { AppSurface } from "./app-surface";

type DeviceSlotItem = {
  id: string;
  label: string | null;
  slotIndex: number;
  status: "ACTIVE" | "BLOCKED" | "FREE";
};

function mapSlotStatus(status: DeviceSlotItem["status"]) {
  if (status === "ACTIVE") {
    return { label: "Активен", tone: "success" as const };
  }

  if (status === "BLOCKED") {
    return { label: "Заблокирован", tone: "default" as const };
  }

  return { label: "Свободен", tone: "default" as const };
}

export function AppDevicesSection({
  deviceSlots,
}: {
  deviceSlots: DeviceSlotItem[];
}) {
  return (
    <AppSectionShell
      description="Лимит устройств реализован через device slots. Слоты создаются автоматически при подтверждении оплаты и соответствуют лимиту выбранного тарифа."
      eyebrow="DEVICES"
      id="devices"
      title="Устройства"
    >
      {deviceSlots.length ? (
        <div className="grid gap-4 md:grid-cols-3">
          {deviceSlots.map((slot) => {
            const slotStatus = mapSlotStatus(slot.status);
            const label = slot.label ?? `Устройство ${slot.slotIndex}`;

            return (
              <AppSurface key={slot.id}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="size-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">{label}</p>
                    </div>
                    <AppStatusPill label={slotStatus.label} tone={slotStatus.tone} />
                  </div>

                  <Button
                    className="h-button w-full px-button-x"
                    radius="card"
                    type="button"
                    variant="outline"
                  >
                    Управление
                  </Button>
                </div>
              </AppSurface>
            );
          })}
        </div>
      ) : (
        <AppSurface>
          <p className="text-sm text-muted-foreground">
            Device slots появятся после первой подтвержденной подписки.
          </p>
        </AppSurface>
      )}
    </AppSectionShell>
  );
}
