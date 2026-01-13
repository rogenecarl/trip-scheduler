"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DriverSelect } from "./driver-select";
import { useAssignments } from "@/hooks/use-assignments";
import { DAY_NAMES_SHORT } from "@/lib/types";
import type { Trip } from "@/lib/types";
import { ClipboardCheck, Search, Sparkles } from "lucide-react";

type StatusFilter = "all" | "pending" | "assigned";

interface AssignmentTableProps {
  initialData?: Trip[];
  onPendingCountChange?: (count: number) => void;
}

export function AssignmentTable({ initialData, onPendingCountChange }: AssignmentTableProps) {
  const { data: assignments, isLoading, error } = useAssignments(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Filter assignments based on search and status
  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];

    return assignments.filter((trip) => {
      // Search filter
      const matchesSearch =
        !searchQuery.trim() ||
        trip.tripId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.assignment?.driver?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      // Status filter
      const isAssigned = !!trip.assignment;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "assigned" && isAssigned) ||
        (statusFilter === "pending" && !isAssigned);

      return matchesSearch && matchesStatus;
    });
  }, [assignments, searchQuery, statusFilter]);

  // Calculate pending count
  const pendingCount = useMemo(() => {
    return assignments?.filter((trip) => !trip.assignment).length ?? 0;
  }, [assignments]);

  // Notify parent of pending count changes
  useEffect(() => {
    onPendingCountChange?.(pendingCount);
  }, [pendingCount, onPendingCountChange]);

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

  return (
    <div className="space-y-4">
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
          <SelectTrigger className="w-[180px]">
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
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          hasFilters={searchQuery.trim().length > 0 || statusFilter !== "all"}
        />
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
                  <TableHead className="font-medium">Analysis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((trip) => (
                  <AssignmentRow key={trip.id} trip={trip} />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredAssignments.map((trip) => (
              <AssignmentCard key={trip.id} trip={trip} />
            ))}
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            Showing {filteredAssignments.length} of {assignments?.length ?? 0}{" "}
            assignments ({pendingCount} pending)
          </p>
        </>
      )}
    </div>
  );
}

function AssignmentRow({ trip }: { trip: Trip }) {
  const isAssigned = !!trip.assignment;
  const hasAIReasoning = trip.assignment?.isAutoAssigned && trip.assignment?.aiReasoning;

  return (
    <TableRow
      className={`hover:bg-muted/50 ${!isAssigned ? "bg-amber-50/50" : ""}`}
    >
      <TableCell className="font-mono text-sm">{trip.tripId}</TableCell>
      <TableCell>{format(new Date(trip.tripDate), "MMM d, yyyy")}</TableCell>
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
      <TableCell className="max-w-[200px]">
        {hasAIReasoning ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-help">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="truncate max-w-[150px]">
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

function AssignmentCard({ trip }: { trip: Trip }) {
  const isAssigned = !!trip.assignment;
  const hasAIReasoning = trip.assignment?.isAutoAssigned && trip.assignment?.aiReasoning;

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${
        !isAssigned ? "bg-amber-50/50 border-amber-200" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-sm font-medium">{trip.tripId}</p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(trip.tripDate), "MMM d, yyyy")} (
            {DAY_NAMES_SHORT[trip.dayOfWeek]})
          </p>
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
            <TableHead className="font-medium">Trip ID</TableHead>
            <TableHead className="font-medium">Date</TableHead>
            <TableHead className="font-medium">Day</TableHead>
            <TableHead className="font-medium">Status</TableHead>
            <TableHead className="font-medium">Driver</TableHead>
            <TableHead className="font-medium">AI Reasoning</TableHead>
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
                <Skeleton className="h-9 w-[140px]" />
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
