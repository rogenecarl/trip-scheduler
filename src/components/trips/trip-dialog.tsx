"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TripForm } from "./trip-form";
import { useCreateTrip } from "@/hooks/use-trips";

interface TripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TripDialog({ open, onOpenChange }: TripDialogProps) {
  const createTrip = useCreateTrip();

  const handleSubmit = async (values: { tripId: string; tripDate: Date }) => {
    await createTrip.mutateAsync({
      tripId: values.tripId,
      tripDate: values.tripDate.toISOString(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Trip</DialogTitle>
          <DialogDescription>
            Add a new trip manually by entering the trip ID and date.
          </DialogDescription>
        </DialogHeader>
        <TripForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={createTrip.isPending}
          showCancel
        />
      </DialogContent>
    </Dialog>
  );
}
