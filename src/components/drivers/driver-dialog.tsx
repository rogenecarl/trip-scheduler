"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DriverForm } from "./driver-form";
import { useCreateDriver, useUpdateDriver } from "@/hooks/use-drivers";
import type { Driver } from "@/lib/types";

interface DriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: Driver | null;
}

export function DriverDialog({ open, onOpenChange, driver }: DriverDialogProps) {
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();

  const isEditing = !!driver;
  const isLoading = createDriver.isPending || updateDriver.isPending;

  const handleSubmit = async (values: {
    name: string;
    availability: number[];
  }) => {
    if (isEditing && driver) {
      await updateDriver.mutateAsync({
        id: driver.id,
        input: values,
      });
    } else {
      await createDriver.mutateAsync(values);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Driver" : "Add Driver"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update driver information and availability."
              : "Add a new driver and set their weekly availability."}
          </DialogDescription>
        </DialogHeader>
        <DriverForm
          driver={driver}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
