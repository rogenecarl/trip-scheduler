"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAvailableDrivers, useUpdateAssignment } from "@/hooks/use-assignments";
import type { Driver } from "@/lib/types";

interface DriverSelectProps {
  tripId: string;
  dayOfWeek: number;
  currentDriverId?: string | null;
  currentDriverName?: string | null;
  disabled?: boolean;
}

export function DriverSelect({
  tripId,
  dayOfWeek,
  currentDriverId,
  currentDriverName,
  disabled,
}: DriverSelectProps) {
  const { data: availableDrivers, isLoading } = useAvailableDrivers(dayOfWeek);
  const updateAssignment = useUpdateAssignment();

  // Derive display value directly from props
  const displayValue = currentDriverId || "unassigned";

  const handleValueChange = (newValue: string) => {
    const driverId = newValue === "unassigned" ? null : newValue;
    updateAssignment.mutate({ tripId, driverId });
  };

  if (isLoading) {
    return <Skeleton className="h-9 w-[140px]" />;
  }

  // Check if current driver is available (for display purposes)
  const isCurrentDriverAvailable =
    currentDriverId &&
    availableDrivers?.some((d: Driver) => d.id === currentDriverId);

  return (
    <Select
      value={displayValue}
      onValueChange={handleValueChange}
      disabled={disabled || updateAssignment.isPending}
    >
      <SelectTrigger
        className={`w-[140px] ${
          displayValue === "unassigned"
            ? "text-amber-600 border-amber-200 bg-amber-50"
            : ""
        }`}
      >
        <SelectValue placeholder="Select driver" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">
          <span className="text-muted-foreground">Unassigned</span>
        </SelectItem>
        {/* Show current driver first if not in available list */}
        {currentDriverId && !isCurrentDriverAvailable && currentDriverName && (
          <SelectItem value={currentDriverId}>
            <span className="flex items-center gap-2">
              {currentDriverName}
              <span className="text-xs text-muted-foreground">(current)</span>
            </span>
          </SelectItem>
        )}
        {/* Show available drivers */}
        {availableDrivers?.map((driver: Driver) => (
          <SelectItem key={driver.id} value={driver.id}>
            {driver.name}
            {driver.id === currentDriverId && (
              <span className="ml-2 text-xs text-muted-foreground">(current)</span>
            )}
          </SelectItem>
        ))}
        {(!availableDrivers || availableDrivers.length === 0) && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            No drivers available for this day
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
