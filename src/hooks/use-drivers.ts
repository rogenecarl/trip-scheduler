"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import {
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
} from "@/actions/driver-actions";

// ============================================
// QUERY: List all drivers
// ============================================

export function useDrivers() {
  return useQuery({
    queryKey: queryKeys.drivers.list(),
    queryFn: async () => {
      const result = await getDrivers();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

// ============================================
// MUTATION: Create driver
// ============================================

export function useCreateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; availability: number[] }) => {
      const formData = new FormData();
      formData.append("name", input.name);
      formData.append("availability", JSON.stringify(input.availability));
      const result = await createDriver(formData);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success("Driver created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create driver");
    },
  });
}

// ============================================
// MUTATION: Update driver
// ============================================

export function useUpdateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: { name: string; availability: number[] };
    }) => {
      const formData = new FormData();
      formData.append("name", input.name);
      formData.append("availability", JSON.stringify(input.availability));
      const result = await updateDriver(id, formData);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      toast.success("Driver updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update driver");
    },
  });
}

// ============================================
// MUTATION: Delete driver
// ============================================

export function useDeleteDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteDriver(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success("Driver deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete driver");
    },
  });
}
