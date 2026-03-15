"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
    return "Выберите дату";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
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
            className="h-input w-full justify-between border-border/70 bg-background/40 px-3 text-left"
            radius="card"
            type="button"
            variant="outline"
          >
            <span>{formatDisplayDate(selected)}</span>
            <CalendarDays className="size-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto rounded-card border-border/70 p-0">
          <Calendar
            mode="single"
            onSelect={setSelected}
            selected={selected}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
