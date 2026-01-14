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
  importTripsFromCSVEnhanced,
  deleteTrip,
  deleteTrips,
} from "@/actions/trip-actions";
import type { Trip, ParsedTrip } from "@/lib/types";

// ============================================
// QUERY: List all trips
// ============================================

export function useTrips(initialData?: Trip[]) {
  return useQuery({
    queryKey: queryKeys.trips.list(),
    queryFn: async () => {
      const result = await getTrips();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialData,
    staleTime: initialData ? 60 * 1000 : 0, // Keep initial data fresh for 1 minute
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
      // Invalidate all trip, assignment, and dashboard queries
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success("Trip created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create trip");
    },
  });
}

// ============================================
// MUTATION: Import trips from CSV (Enhanced)
// ============================================

export function useImportTrips() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trips: ParsedTrip[]) => {
      const result = await importTripsFromCSVEnhanced(trips);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      // Invalidate all paginated queries and lists
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      // Enhanced feedback with duplicate details
      if (data.duplicateTripIds.length > 0) {
        const maxShow = 3;
        const duplicateList = data.duplicateTripIds.slice(0, maxShow).join(", ");
        const moreCount = data.duplicateTripIds.length - maxShow;
        const duplicateInfo =
          moreCount > 0 ? `${duplicateList} and ${moreCount} more` : duplicateList;

        toast.success(
          `Imported ${data.imported} trips. Skipped ${data.skipped} duplicates: ${duplicateInfo}`
        );
      } else {
        toast.success(`Imported ${data.imported} trips successfully`);
      }
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
      // Invalidate all trip, assignment, and dashboard queries
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success("Trip deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete trip");
    },
  });
}

// ============================================
// MUTATION: Bulk delete trips
// ============================================

export function useDeleteTrips() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const result = await deleteTrips(ids);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success(
        `${data.count} ${data.count === 1 ? "trip" : "trips"} deleted successfully`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete trips");
    },
  });
}
