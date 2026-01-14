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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { TablePagination } from "@/components/ui/table-pagination";
import { DeleteTripDialog } from "./delete-trip-dialog";
import { usePaginatedTrips } from "@/hooks/use-paginated-trips";
import { useDeleteTrips } from "@/hooks/use-trips";
import { DAY_NAMES_SHORT } from "@/lib/types";
import type { Trip } from "@/lib/types";
import { Package, Search, Trash2, X } from "lucide-react";

type StatusFilter = "all" | "pending" | "assigned";
const DEFAULT_PAGE_SIZE = 20;

export function TripTable() {
  // Pagination and filter state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Bulk delete mutation
  const deleteTrips = useDeleteTrips();

  // Fetch paginated data (no server-side filtering)
  const { data, isLoading, error } = usePaginatedTrips({
    page,
    pageSize,
  });

  const pagination = data?.pagination;

  // Client-side filtering for instant search and status filter
  const trips = useMemo(() => {
    let filtered = data?.data ?? [];

    // Filter by status
    if (statusFilter === "pending") {
      filtered = filtered.filter((trip) => !trip.assignment);
    } else if (statusFilter === "assigned") {
      filtered = filtered.filter((trip) => !!trip.assignment);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((trip) =>
        trip.tripId.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [data?.data, searchQuery, statusFilter]);

  // Selection helpers
  const allSelected = trips.length > 0 && trips.every((t) => selectedIds.has(t.id));
  const someSelected = trips.some((t) => selectedIds.has(t.id));
  const selectedCount = selectedIds.size;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(trips.map((t) => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    await deleteTrips.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
    setShowBulkDeleteDialog(false);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
    setSelectedIds(new Set()); // Clear selection on page change
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedIds(new Set()); // Clear selection on page change
  };

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

  const hasFilters = searchQuery.length > 0 || statusFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Selection Toolbar */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedCount} {selectedCount === 1 ? "trip" : "trips"} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-7 px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkDeleteDialog(true)}
            disabled={deleteTrips.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
        </div>
      )}

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
      ) : trips.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[140px]">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all trips"
                        className={someSelected && !allSelected ? "opacity-50" : ""}
                      />
                      <span className="text-xs font-medium text-muted-foreground">Select All</span>
                    </div>
                  </TableHead>
                  <TableHead className="font-medium">Trip ID</TableHead>
                  <TableHead className="font-medium">Stage</TableHead>
                  <TableHead className="font-medium">Date</TableHead>
                  <TableHead className="font-medium">Time</TableHead>
                  <TableHead className="font-medium">Day</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium">Driver</TableHead>
                  <TableHead className="font-medium w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => (
                  <TableRow
                    key={trip.id}
                    className={`hover:bg-muted/50 ${selectedIds.has(trip.id) ? "bg-muted/30" : ""}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(trip.id)}
                        onCheckedChange={(checked) =>
                          handleSelectOne(trip.id, checked as boolean)
                        }
                        aria-label={`Select trip ${trip.tripId}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {trip.tripId}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={trip.tripStage === "Upcoming" ? "default" : "secondary"}
                      >
                        {trip.tripStage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(trip.tripDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {trip.plannedArrivalTime || "—"}
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
            {trips.map((trip) => (
              <div
                key={trip.id}
                className={`rounded-lg border p-4 space-y-3 ${selectedIds.has(trip.id) ? "bg-muted/30 border-primary/50" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(trip.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(trip.id, checked as boolean)
                      }
                      aria-label={`Select trip ${trip.tripId}`}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-medium">
                          {trip.tripId}
                        </p>
                        <Badge
                          variant={trip.tripStage === "Upcoming" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {trip.tripStage}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(trip.tripDate), "MMM d, yyyy")} ({DAY_NAMES_SHORT[trip.dayOfWeek]})
                        {trip.plannedArrivalTime && (
                          <span className="font-mono ml-1">@ {trip.plannedArrivalTime}</span>
                        )}
                      </p>
                    </div>
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
                <div className="flex items-center justify-between pl-7">
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

          {/* Pagination */}
          {pagination && (
            <TablePagination
              pagination={pagination}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              isLoading={isLoading}
            />
          )}
        </>
      )}

      {/* Delete Single Trip Dialog */}
      <DeleteTripDialog
        open={!!deletingTrip}
        onOpenChange={(open) => !open && setDeletingTrip(null)}
        trip={deletingTrip}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} trips?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              selected trips and remove their assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTrips.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleteTrips.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteTrips.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TripTableSkeleton() {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[140px]">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-3 w-14" />
              </div>
            </TableHead>
            <TableHead className="font-medium">Trip ID</TableHead>
            <TableHead className="font-medium">Stage</TableHead>
            <TableHead className="font-medium">Date</TableHead>
            <TableHead className="font-medium">Time</TableHead>
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
                <Skeleton className="h-4 w-4" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-12" />
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
