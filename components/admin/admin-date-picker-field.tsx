"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function toEndOfDayIso(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  ).toISOString();
}

function formatDisplayDate(date: Date | undefined) {
  if (!date) {
    return "Pick a date";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getTodayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function AdminDatePickerField({
  defaultValue,
  label,
  name,
}: {
  defaultValue?: Date | null;
  label: string;
  name: string;
}) {
  const [selected, setSelected] = useState<Date | undefined>(defaultValue ?? undefined);

  const serializedValue = useMemo(
    () => (selected ? toEndOfDayIso(selected) : ""),
    [selected]
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <input name={name} type="hidden" value={serializedValue} />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            className={cn(
              "h-input w-full justify-start border-border/70 bg-background/40 px-3 text-left font-normal",
              !selected && "text-muted-foreground"
            )}
            radius="card"
            type="button"
            variant="outline"
          >
            <CalendarDays className="mr-2 size-4 text-muted-foreground" />
            <span>{formatDisplayDate(selected)}</span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          avoidCollisions
          collisionPadding={12}
          side="bottom"
          sideOffset={8}
          className="w-auto max-h-[min(360px,var(--radix-popover-content-available-height))] overflow-auto rounded-card border-border/70 p-0"
        >
          <Calendar
            disabled={(date) => date < getTodayStart()}
            initialFocus
            mode="single"
            onSelect={setSelected}
            selected={selected}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
