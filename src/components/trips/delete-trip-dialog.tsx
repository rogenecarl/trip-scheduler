"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteTrip } from "@/hooks/use-trips";
import type { Trip } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface DeleteTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;
}

export function DeleteTripDialog({
  open,
  onOpenChange,
  trip,
}: DeleteTripDialogProps) {
  const deleteTrip = useDeleteTrip();

  const handleDelete = async () => {
    if (!trip) return;
    await deleteTrip.mutateAsync(trip.id);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Trip</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete trip{" "}
            <span className="font-mono font-medium text-foreground">
              {trip?.tripId}
            </span>
            ? This action cannot be undone.
            {trip?.assignment && (
              <span className="block mt-2 text-amber-600">
                This trip is currently assigned to {trip.assignment.driver?.name}.
                The assignment will also be deleted.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteTrip.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteTrip.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteTrip.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
