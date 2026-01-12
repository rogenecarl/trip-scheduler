"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import {
  getTrips,
  createTrip,
  importTripsFromCSV,
  deleteTrip,
} from "@/actions/trip-actions";

// ============================================
// QUERY: List all trips
// ============================================

export function useTrips() {
  return useQuery({
    queryKey: queryKeys.trips.list(),
    queryFn: async () => {
      const result = await getTrips();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

// ============================================
// MUTATION: Create trip
// ============================================

export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { tripId: string; tripDate: string }) => {
      const formData = new FormData();
      formData.append("tripId", input.tripId);
      formData.append("tripDate", input.tripDate);
      const result = await createTrip(formData);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      toast.success("Trip created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create trip");
    },
  });
}

// ============================================
// MUTATION: Import trips from CSV
// ============================================

export function useImportTrips() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      trips: { tripId: string; tripDate: Date; dayOfWeek: number }[]
    ) => {
      const result = await importTripsFromCSV(trips);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      toast.success(
        `Imported ${data.imported} trips${data.skipped > 0 ? `, ${data.skipped} skipped` : ""}`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to import trips");
    },
  });
}

// ============================================
// MUTATION: Delete trip
// ============================================

export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteTrip(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      toast.success("Trip deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete trip");
    },
  });
}
