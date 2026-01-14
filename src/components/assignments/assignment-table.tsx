"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TablePagination } from "@/components/ui/table-pagination";
import { DriverSelect } from "./driver-select";
import { usePaginatedAssignments } from "@/hooks/use-paginated-assignments";
import { useBulkUnassign } from "@/hooks/use-assignments";
import { DAY_NAMES_SHORT } from "@/lib/types";
import type { Trip } from "@/lib/types";
import { ClipboardCheck, Search, Sparkles, Trash2, X } from "lucide-react";

type StatusFilter = "all" | "pending" | "assigned";
const DEFAULT_PAGE_SIZE = 20;

interface AssignmentTableProps {
  onPendingCountChange?: (count: number) => void;
}

export function AssignmentTable({ onPendingCountChange }: AssignmentTableProps) {
  // Pagination and filter state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkUnassignDialog, setShowBulkUnassignDialog] = useState(false);

  // Bulk unassign mutation
  const bulkUnassign = useBulkUnassign();

  // Fetch paginated data (no server-side filtering)
  const { data, isLoading, error } = usePaginatedAssignments({
    page,
    pageSize,
  });

  const pagination = data?.pagination;

  // Client-side filtering for instant search and status filter
  const assignments = useMemo(() => {
    let filtered = data?.data ?? [];

    // Filter by status
    if (statusFilter === "pending") {
      filtered = filtered.filter((trip) => !trip.assignment);
    } else if (statusFilter === "assigned") {
      filtered = filtered.filter((trip) => !!trip.assignment);
    }

    // Filter by search query (trip ID or driver name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (trip) =>
          trip.tripId.toLowerCase().includes(query) ||
          trip.assignment?.driver?.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [data?.data, searchQuery, statusFilter]);

  // Calculate pending count from filtered data (for UI purposes)
  const pendingCount = assignments.filter((trip) => !trip.assignment).length;

  // Get only assigned trips for selection (can only unassign what's assigned)
  const assignedTrips = assignments.filter((trip) => !!trip.assignment);

  // Selection helpers
  const allAssignedSelected = assignedTrips.length > 0 && assignedTrips.every((t) => selectedIds.has(t.id));
  const someSelected = assignedTrips.some((t) => selectedIds.has(t.id));
  const selectedCount = selectedIds.size;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(assignedTrips.map((t) => t.id)));
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

  const handleBulkUnassign = async () => {
    await bulkUnassign.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
    setShowBulkUnassignDialog(false);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Notify parent of pending count changes
  useEffect(() => {
    onPendingCountChange?.(pendingCount);
  }, [pendingCount, onPendingCountChange]);

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
          <ClipboardCheck className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-medium mb-1">Failed to load assignments</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error.message || "An error occurred while loading assignments."}
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
            onClick={() => setShowBulkUnassignDialog(true)}
            disabled={bulkUnassign.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Unassign Selected
          </Button>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by Trip ID or Driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <AssignmentTableSkeleton />
      ) : assignments.length === 0 ? (
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
                        checked={allAssignedSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all assigned trips"
                        className={someSelected && !allAssignedSelected ? "opacity-50" : ""}
                        disabled={assignedTrips.length === 0}
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
                  <TableHead className="font-medium">Analysis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((trip) => (
                  <AssignmentRow
                    key={trip.id}
                    trip={trip}
                    isSelected={selectedIds.has(trip.id)}
                    onSelectChange={(checked) => handleSelectOne(trip.id, checked)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {assignments.map((trip) => (
              <AssignmentCard
                key={trip.id}
                trip={trip}
                isSelected={selectedIds.has(trip.id)}
                onSelectChange={(checked) => handleSelectOne(trip.id, checked)}
              />
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

      {/* Bulk Unassign Confirmation Dialog */}
      <AlertDialog open={showBulkUnassignDialog} onOpenChange={setShowBulkUnassignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign {selectedCount} trips?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the driver assignments from the selected trips.
              The trips will return to pending status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkUnassign.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkUnassign}
              disabled={bulkUnassign.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {bulkUnassign.isPending ? "Unassigning..." : "Unassign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AssignmentRow({
  trip,
  isSelected,
  onSelectChange,
}: {
  trip: Trip;
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
}) {
  const isAssigned = !!trip.assignment;
  const hasAIReasoning = trip.assignment?.isAutoAssigned && trip.assignment?.aiReasoning;

  return (
    <TableRow
      className={`hover:bg-muted/50 ${!isAssigned ? "bg-amber-50/50" : ""} ${isSelected ? "bg-muted/30" : ""}`}
    >
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectChange(checked as boolean)}
          aria-label={`Select trip ${trip.tripId}`}
          disabled={!isAssigned}
        />
      </TableCell>
      <TableCell className="font-mono text-sm">{trip.tripId}</TableCell>
      <TableCell>
        <Badge
          variant={trip.tripStage === "Upcoming" ? "default" : "secondary"}
        >
          {trip.tripStage}
        </Badge>
      </TableCell>
      <TableCell>{format(new Date(trip.tripDate), "MMM d, yyyy")}</TableCell>
      <TableCell className="font-mono text-sm">
        {trip.plannedArrivalTime || "—"}
      </TableCell>
      <TableCell>
        <Badge variant="outline">{DAY_NAMES_SHORT[trip.dayOfWeek]}</Badge>
      </TableCell>
      <TableCell>
        {isAssigned ? (
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
        <DriverSelect
          tripId={trip.id}
          dayOfWeek={trip.dayOfWeek}
          currentDriverId={trip.assignment?.driverId}
          currentDriverName={trip.assignment?.driver?.name}
        />
      </TableCell>
      <TableCell className="max-w-50">
        {hasAIReasoning ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-help">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="truncate max-w-37.5">
                    {trip.assignment?.aiReasoning}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p>{trip.assignment?.aiReasoning}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : trip.assignment && !trip.assignment.isAutoAssigned ? (
          <span className="text-sm text-muted-foreground">Manual assignment</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

function AssignmentCard({
  trip,
  isSelected,
  onSelectChange,
}: {
  trip: Trip;
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
}) {
  const isAssigned = !!trip.assignment;
  const hasAIReasoning = trip.assignment?.isAutoAssigned && trip.assignment?.aiReasoning;

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${
        !isAssigned ? "bg-amber-50/50 border-amber-200" : ""
      } ${isSelected ? "bg-muted/30 border-primary/50" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectChange(checked as boolean)}
            aria-label={`Select trip ${trip.tripId}`}
            disabled={!isAssigned}
            className="mt-1"
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm font-medium">{trip.tripId}</p>
              <Badge
                variant={trip.tripStage === "Upcoming" ? "default" : "secondary"}
                className="text-xs"
              >
                {trip.tripStage}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(trip.tripDate), "MMM d, yyyy")} (
              {DAY_NAMES_SHORT[trip.dayOfWeek]})
              {trip.plannedArrivalTime && (
                <span className="font-mono ml-1">@ {trip.plannedArrivalTime}</span>
              )}
            </p>
          </div>
        </div>
        {isAssigned ? (
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

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Driver:</span>
        <DriverSelect
          tripId={trip.id}
          dayOfWeek={trip.dayOfWeek}
          currentDriverId={trip.assignment?.driverId}
          currentDriverName={trip.assignment?.driver?.name}
        />
      </div>

      {hasAIReasoning && (
        <div className="flex items-start gap-2 pt-2 border-t text-sm">
          <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <p className="text-muted-foreground">{trip.assignment?.aiReasoning}</p>
        </div>
      )}
    </div>
  );
}

function AssignmentTableSkeleton() {
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
            <TableHead className="font-medium">Analysis</TableHead>
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
                <Skeleton className="h-9 w-35" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
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
        <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">
        {hasFilters ? "No assignments found" : "No trips to assign"}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {hasFilters
          ? "Try adjusting your search or filter."
          : "Add trips first to start assigning drivers."}
      </p>
    </div>
  );
}
