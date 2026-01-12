"use client";

import { cn } from "@/lib/utils";
import { DAY_NAMES_SHORT } from "@/lib/types";

interface AvailabilityPickerProps {
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
}

export function AvailabilityPicker({
  value,
  onChange,
  disabled,
}: AvailabilityPickerProps) {
  const toggleDay = (day: number) => {
    if (disabled) return;

    if (value.includes(day)) {
      // Don't allow removing the last day
      if (value.length > 1) {
        onChange(value.filter((d) => d !== day));
      }
    } else {
      onChange([...value, day].sort((a, b) => a - b));
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {DAY_NAMES_SHORT.map((dayName, index) => {
        const isSelected = value.includes(index);
        return (
          <button
            key={index}
            type="button"
            onClick={() => toggleDay(index)}
            disabled={disabled}
            aria-label={`${isSelected ? "Remove" : "Add"} ${dayName}`}
            aria-pressed={isSelected}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              isSelected
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {dayName}
          </button>
        );
      })}
    </div>
  );
}

// Read-only display component for tables
interface AvailabilityDisplayProps {
  availability: { dayOfWeek: number; isAvailable: boolean }[];
  size?: "sm" | "default";
}

export function AvailabilityDisplay({
  availability,
  size = "default",
}: AvailabilityDisplayProps) {
  const availableDays = availability
    .filter((a) => a.isAvailable)
    .map((a) => a.dayOfWeek);

  return (
    <div className="flex flex-wrap gap-1">
      {DAY_NAMES_SHORT.map((dayName, index) => {
        const isAvailable = availableDays.includes(index);
        return (
          <span
            key={index}
            aria-label={`${dayName}: ${isAvailable ? "Available" : "Unavailable"}`}
            className={cn(
              "flex items-center justify-center rounded-full font-medium",
              size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs",
              isAvailable
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {dayName.charAt(0)}
          </span>
        );
      })}
    </div>
  );
}
