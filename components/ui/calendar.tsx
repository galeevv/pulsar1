"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "space-y-4",
        caption:
          "relative flex items-center justify-center pt-1 text-sm font-medium",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        button_previous:
          "absolute left-1 inline-flex size-7 items-center justify-center rounded-card border border-border bg-background/70 text-foreground transition-colors hover:bg-accent",
        button_next:
          "absolute right-1 inline-flex size-7 items-center justify-center rounded-card border border-border bg-background/70 text-foreground transition-colors hover:bg-accent",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "w-9 text-[0.8rem] font-normal text-muted-foreground",
        week: "mt-2 flex w-full",
        day: "relative size-9 p-0 text-center text-sm",
        day_button:
          "inline-flex size-9 items-center justify-center rounded-card border border-transparent text-sm transition-colors hover:border-border hover:bg-accent",
        selected:
          "[&>button]:border-border [&>button]:bg-primary [&>button]:text-primary-foreground",
        today: "[&>button]:border-border [&>button]:bg-background/80",
        outside: "[&>button]:text-muted-foreground/40",
        disabled: "[&>button]:cursor-not-allowed [&>button]:opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...iconProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...iconProps} />
          ) : (
            <ChevronRight className="size-4" {...iconProps} />
          ),
      }}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  );
}

export { Calendar };
