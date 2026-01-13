"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import {
  getAssignments,
  getAssignmentStats,
  updateAssignment,
  getAvailableDriversForDay,
} from "@/actions/assignment-actions";
import { autoAssignDrivers } from "@/actions/ai-actions";

// ============================================
// QUERY: LIST ALL ASSIGNMENTS
// ============================================

export function useAssignments() {
  return useQuery({
    queryKey: queryKeys.assignments.list(),
    queryFn: async () => {
      const result = await getAssignments();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

// ============================================
// QUERY: ASSIGNMENT STATS
// ============================================

export function useAssignmentStats() {
  return useQuery({
    queryKey: queryKeys.assignments.stats(),
    queryFn: async () => {
      const result = await getAssignmentStats();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

// ============================================
// QUERY: AVAILABLE DRIVERS FOR A DAY
// ============================================

export function useAvailableDrivers(dayOfWeek: number) {
  return useQuery({
    queryKey: queryKeys.drivers.available(dayOfWeek),
    queryFn: async () => {
      const result = await getAvailableDriversForDay(dayOfWeek);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: dayOfWeek >= 0 && dayOfWeek <= 6,
  });
}

// ============================================
// MUTATION: UPDATE ASSIGNMENT
// ============================================

export function useUpdateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      driverId,
    }: {
      tripId: string;
      driverId: string | null;
    }) => {
      const result = await updateAssignment(tripId, driverId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success("Assignment updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update assignment");
    },
  });
}

// ============================================
// MUTATION: AI AUTO-ASSIGN
// ============================================

export function useAIAssign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: autoAssignDrivers,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      // Show only ONE toast for success or failure
      // Details are shown in the modal, so we keep the toast simple
      if (data.success) {
        const assignedCount = data.assignments?.length ?? 0;
        const hasWarnings = data.warnings && data.warnings.length > 0;

        if (assignedCount === 0) {
          toast.info("No trips were assigned. Check the details for more info.");
        } else if (hasWarnings) {
          toast.success(
            `Assigned ${assignedCount} trip${assignedCount !== 1 ? "s" : ""} with some warnings`
          );
        } else {
          toast.success(
            `Successfully assigned ${assignedCount} trip${assignedCount !== 1 ? "s" : ""}`
          );
        }
      } else {
        toast.error(data.error || "Failed to assign drivers");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "An error occurred while assigning drivers");
    },
  });
}
