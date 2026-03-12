import { PlugZap, ShieldAlert, Smartphone } from "lucide-react";

import { activateDeviceSlotAction } from "@/app/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { AppCopySubscriptionButton } from "./app-copy-subscription-button";

type DeviceSlotItem = {
  configUrl: string | null;
  id: string;
  label: string | null;
  lastSyncError: string | null;
  slotIndex: number;
  status: "ACTIVE" | "BLOCKED" | "FREE";
};

type ActiveSubscriptionItem = {
  deviceLimit: number;
  deviceSlots: DeviceSlotItem[];
  devices: number;
} | null;

function getSlotStatusMeta(status: DeviceSlotItem["status"]) {
  if (status === "ACTIVE") {
    return {
      badgeVariant: "default" as const,
      label: "Активно",
    };
  }

  if (status === "BLOCKED") {
    return {
      badgeVariant: "destructive" as const,
      label: "Заблокирован",
    };
  }

  return {
    badgeVariant: "secondary" as const,
    label: "Свободно",
  };
}

function getSlotTitle(slot: DeviceSlotItem) {
  if (slot.label && slot.label.trim().length > 0) {
    return slot.label.trim();
  }

  return `Устройство ${slot.slotIndex}`;
}

function renderDeviceSlotCards(slots: DeviceSlotItem[]) {
  return slots.map((slot) => {
    const statusMeta = getSlotStatusMeta(slot.status);
    const slotTitle = getSlotTitle(slot);
    const isActive = slot.status === "ACTIVE";
    const isFree = slot.status === "FREE";

    return (
      <article
        className="rounded-card border border-border bg-background/60 p-card-compact transition-colors md:p-card-compact-md"
        key={slot.id}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-2">
              <span className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-card border border-border bg-background/60">
                <Smartphone className="size-[22px] text-white" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{slotTitle}</p>
              </div>
            </div>

            {!isActive ? <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge> : null}
          </div>

          {slot.lastSyncError ? (
            <div className="rounded-card border border-destructive/40 bg-destructive/10 px-3 py-2">
              <p className="text-xs text-destructive">Ошибка синхронизации: {slot.lastSyncError}</p>
            </div>
          ) : null}

          {isActive ? (
            <div className="min-w-0">
              <AppCopySubscriptionButton subscriptionUrl={slot.configUrl} />
            </div>
          ) : isFree ? (
            <form action={activateDeviceSlotAction}>
              <input name="slotId" type="hidden" value={slot.id} />
              <Button className="h-button w-full px-button-x" radius="card" type="submit">
                <PlugZap className="size-4" />
                Подключить устройство
              </Button>
            </form>
          ) : (
            <Button
              className="h-button w-full px-button-x"
              disabled
              radius="card"
              type="button"
              variant="outline"
            >
              <ShieldAlert className="size-4" />
              Слот заблокирован
            </Button>
          )}
        </div>
      </article>
    );
  });
}

export function AppDevicesManagementDialog({
  activeSubscription,
}: {
  activeSubscription: ActiveSubscriptionItem;
}) {
  const devicesLimit = activeSubscription
    ? Math.max(activeSubscription.devices, activeSubscription.deviceLimit)
    : 0;
  const shouldConstrainHeight = Boolean(activeSubscription && activeSubscription.deviceSlots.length > 3);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-button w-full px-button-x" radius="card" type="button" variant="outline">
          <Smartphone className="size-4" />
          Управление устройствами
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[88svh] overflow-hidden p-4 sm:max-h-[92svh] sm:max-w-4xl sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle>Управление устройствами</DialogTitle>
          <DialogDescription>1 Device = 1 Link</DialogDescription>
        </DialogHeader>

        {!activeSubscription ? (
          <div className="rounded-card border border-border/70 bg-card/40 p-card-compact md:p-card-compact-md">
            <p className="text-sm text-muted-foreground">
              Блок устройств станет доступен после активации первой подписки.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-card border border-border/70 bg-card/40 p-card-compact md:p-card-compact-md">
              <p className="text-sm text-muted-foreground">
                Доступно устройств по текущей подписке:{" "}
                <span className="font-semibold text-foreground">{devicesLimit}</span>
              </p>
            </div>

            {shouldConstrainHeight ? (
              <ScrollArea className="h-[50svh] rounded-card border border-border/70 bg-background/20 p-2 sm:h-[56svh] md:h-[520px]">
                <div className="space-y-2 pr-1">{renderDeviceSlotCards(activeSubscription.deviceSlots)}</div>
              </ScrollArea>
            ) : (
              <div className="space-y-2">{renderDeviceSlotCards(activeSubscription.deviceSlots)}</div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
