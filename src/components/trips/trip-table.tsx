"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteTripDialog } from "./delete-trip-dialog";
import { useTrips } from "@/hooks/use-trips";
import { DAY_NAMES_SHORT } from "@/lib/types";
import type { Trip } from "@/lib/types";
import { Package, Search, Trash2 } from "lucide-react";

type StatusFilter = "all" | "pending" | "assigned";

export function TripTable() {
  const { data: trips, isLoading, error } = useTrips();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);

  // Filter trips based on search and status
  const filteredTrips = useMemo(() => {
    if (!trips) return [];

    return trips.filter((trip) => {
      // Search filter
      const matchesSearch =
        !searchQuery.trim() ||
        trip.tripId.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const isAssigned = !!trip.assignment;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "assigned" && isAssigned) ||
        (statusFilter === "pending" && !isAssigned);

      return matchesSearch && matchesStatus;
    });
  }, [trips, searchQuery, statusFilter]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <Package className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-medium mb-1">Failed to load trips</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error.message || "An error occurred while loading trips."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by Trip ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trips</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <TripTableSkeleton />
      ) : filteredTrips.length === 0 ? (
        <EmptyState hasFilters={searchQuery.trim().length > 0 || statusFilter !== "all"} />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium">Trip ID</TableHead>
                  <TableHead className="font-medium">Date</TableHead>
                  <TableHead className="font-medium">Day</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium">Driver</TableHead>
                  <TableHead className="font-medium w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.map((trip) => (
                  <TableRow key={trip.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">
                      {trip.tripId}
                    </TableCell>
                    <TableCell>
                      {format(new Date(trip.tripDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {DAY_NAMES_SHORT[trip.dayOfWeek]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {trip.assignment ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          Assigned
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200"
                        >
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {trip.assignment?.driver?.name || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingTrip(trip)}
                        aria-label={`Delete trip ${trip.tripId}`}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredTrips.map((trip) => (
              <div key={trip.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-sm font-medium">
                      {trip.tripId}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(trip.tripDate), "MMM d, yyyy")} ({DAY_NAMES_SHORT[trip.dayOfWeek]})
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingTrip(trip)}
                    aria-label={`Delete trip ${trip.tripId}`}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    {trip.assignment ? (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        Assigned
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200"
                      >
                        Pending
                      </Badge>
                    )}
                  </div>
                  {trip.assignment?.driver && (
                    <span className="text-sm">
                      {trip.assignment.driver.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            Showing {filteredTrips.length} of {trips?.length ?? 0} trips
          </p>
        </>
      )}

      {/* Delete Dialog */}
      <DeleteTripDialog
        open={!!deletingTrip}
        onOpenChange={(open) => !open && setDeletingTrip(null)}
        trip={deletingTrip}
      />
    </div>
  );
}

function TripTableSkeleton() {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-medium">Trip ID</TableHead>
            <TableHead className="font-medium">Date</TableHead>
            <TableHead className="font-medium">Day</TableHead>
            <TableHead className="font-medium">Status</TableHead>
            <TableHead className="font-medium">Driver</TableHead>
            <TableHead className="font-medium w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-10" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Package className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">
        {hasFilters ? "No trips found" : "No trips yet"}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {hasFilters
          ? "Try adjusting your search or filter."
          : "Add trips manually or import from a CSV file."}
      </p>
    </div>
  );
}
