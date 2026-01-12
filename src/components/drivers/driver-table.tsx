"use client";

import { useState, useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { AvailabilityDisplay } from "./availability-picker";
import { DriverDialog } from "./driver-dialog";
import { DeleteDriverDialog } from "./delete-driver-dialog";
import { useDrivers } from "@/hooks/use-drivers";
import type { Driver } from "@/lib/types";
import { Pencil, Search, Trash2, Users, UserPlus } from "lucide-react";

export function DriverTable() {
  const { data: drivers, isLoading, error } = useDrivers();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deletingDriver, setDeletingDriver] = useState<Driver | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Filter drivers based on search
  const filteredDrivers = useMemo(() => {
    if (!drivers) return [];
    if (!searchQuery.trim()) return drivers;

    const query = searchQuery.toLowerCase();
    return drivers.filter((driver) =>
      driver.name.toLowerCase().includes(query)
    );
  }, [drivers, searchQuery]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <Users className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-medium mb-1">Failed to load drivers</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error.message || "An error occurred while loading drivers."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Add Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search drivers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Driver
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <DriverTableSkeleton />
      ) : filteredDrivers.length === 0 ? (
        <EmptyState
          hasSearch={searchQuery.trim().length > 0}
          onAddClick={() => setIsAddDialogOpen(true)}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium">Name</TableHead>
                  <TableHead className="font-medium">Availability</TableHead>
                  <TableHead className="font-medium w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((driver) => (
                  <TableRow key={driver.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>
                      <AvailabilityDisplay
                        availability={driver.availability}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingDriver(driver)}
                          aria-label={`Edit ${driver.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingDriver(driver)}
                          aria-label={`Delete ${driver.name}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredDrivers.map((driver) => (
              <div
                key={driver.id}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{driver.name}</h3>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingDriver(driver)}
                      aria-label={`Edit ${driver.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingDriver(driver)}
                      aria-label={`Delete ${driver.name}`}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Availability
                  </p>
                  <AvailabilityDisplay
                    availability={driver.availability}
                    size="default"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            Showing {filteredDrivers.length} of {drivers?.length ?? 0} drivers
          </p>
        </>
      )}

      {/* Dialogs */}
      <DriverDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        driver={null}
      />

      <DriverDialog
        open={!!editingDriver}
        onOpenChange={(open) => !open && setEditingDriver(null)}
        driver={editingDriver}
      />

      <DeleteDriverDialog
        open={!!deletingDriver}
        onOpenChange={(open) => !open && setDeletingDriver(null)}
        driver={deletingDriver}
      />
    </div>
  );
}

function DriverTableSkeleton() {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-medium">Name</TableHead>
            <TableHead className="font-medium">Availability</TableHead>
            <TableHead className="font-medium w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {[...Array(7)].map((_, j) => (
                    <Skeleton key={j} className="h-6 w-6 rounded-full" />
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EmptyState({
  hasSearch,
  onAddClick,
}: {
  hasSearch: boolean;
  onAddClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">
        {hasSearch ? "No drivers found" : "No drivers yet"}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {hasSearch
          ? "Try adjusting your search query."
          : "Get started by adding your first driver."}
      </p>
      {!hasSearch && (
        <Button onClick={onAddClick}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Driver
        </Button>
      )}
    </div>
  );
}
