"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AvailabilityPicker } from "./availability-picker";
import type { Driver } from "@/lib/types";
import { Loader2 } from "lucide-react";

const driverFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  availability: z.array(z.number()).min(1, "Select at least one day"),
});

type DriverFormValues = z.infer<typeof driverFormSchema>;

interface DriverFormProps {
  driver?: Driver | null;
  onSubmit: (values: DriverFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DriverForm({
  driver,
  onSubmit,
  onCancel,
  isLoading,
}: DriverFormProps) {
  // Get initial availability days from driver
  const initialAvailability = driver?.availability
    ?.filter((a) => a.isAvailable)
    .map((a) => a.dayOfWeek) ?? [1, 2, 3, 4, 5]; // Default to Mon-Fri

  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      name: driver?.name ?? "",
      availability: initialAvailability,
    },
  });

  const handleSubmit = (values: DriverFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter driver name"
                  autoComplete="off"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="availability"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Available Days</FormLabel>
              <FormDescription>
                Select the days this driver is available to work
              </FormDescription>
              <FormControl>
                <AvailabilityPicker
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {driver ? "Save Changes" : "Add Driver"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
