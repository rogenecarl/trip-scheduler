"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const tripFormSchema = z.object({
  tripId: z
    .string()
    .min(1, "Trip ID is required")
    .regex(/^T-/, "Trip ID must start with T-"),
  tripDate: z.date({ message: "Date is required" }),
});

type TripFormValues = z.infer<typeof tripFormSchema>;

interface TripFormProps {
  onSubmit: (values: TripFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  showCancel?: boolean;
}

export function TripForm({
  onSubmit,
  onCancel,
  isLoading,
  showCancel = false,
}: TripFormProps) {
  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      tripId: "T-",
      tripDate: undefined,
    },
  });

  const handleSubmit = (values: TripFormValues) => {
    onSubmit(values);
    form.reset({ tripId: "T-", tripDate: undefined });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="tripId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trip ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="T-XXXXXXXX"
                    autoComplete="off"
                    disabled={isLoading}
                    className="font-mono"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Unique identifier starting with T-
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tripDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        disabled={isLoading}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>The date of the trip</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          {showCancel && onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Trip
          </Button>
        </div>
      </form>
    </Form>
  );
}
