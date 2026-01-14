"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  CheckCircle2,
  FileX,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { DAY_NAMES_SHORT } from "@/lib/types";
import type { CSVParseResult } from "@/lib/csv-parser";

interface CSVPreviewProps {
  result: CSVParseResult;
  onImport: () => void;
  onCancel: () => void;
  isImporting: boolean;
}

export function CSVPreview({
  result,
  onImport,
  onCancel,
  isImporting,
}: CSVPreviewProps) {
  const { trips, errors, skippedCanceled, skippedDuplicate, skippedInvalidDate } =
    result;

  const hasWarnings =
    errors.length > 0 ||
    skippedCanceled > 0 ||
    skippedDuplicate > 0 ||
    skippedInvalidDate > 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm">
            <span className="font-medium">{trips.length}</span> trips ready to
            import
          </span>
        </div>

        {hasWarnings && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm">
              {skippedCanceled > 0 && (
                <span>{skippedCanceled} canceled, </span>
              )}
              {skippedDuplicate > 0 && (
                <span>{skippedDuplicate} duplicates, </span>
              )}
              {skippedInvalidDate > 0 && (
                <span>{skippedInvalidDate} invalid dates</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Preview Table */}
      {trips.length > 0 ? (
        <div className="rounded-lg border">
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium">Trip ID</TableHead>
                  <TableHead className="font-medium">Stage</TableHead>
                  <TableHead className="font-medium">Date</TableHead>
                  <TableHead className="font-medium">Time</TableHead>
                  <TableHead className="font-medium">Day</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => (
                  <TableRow key={trip.tripId}>
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
                    <TableCell>{format(trip.tripDate, "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {trip.plannedArrivalTime || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {DAY_NAMES_SHORT[trip.dayOfWeek]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FileX className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No valid trips found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Please check your CSV file and try again.
          </p>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
            Parsing Warnings
          </h4>
          <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
            {errors.slice(0, 5).map((error, i) => (
              <li key={i} className="text-xs">
                {error}
              </li>
            ))}
            {errors.length > 5 && (
              <li className="text-xs text-amber-600 dark:text-amber-400">
                ...and {errors.length - 5} more warnings
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isImporting}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button
          onClick={onImport}
          disabled={isImporting || trips.length === 0}
        >
          {isImporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Import {trips.length} Trips
        </Button>
      </div>
    </div>
  );
}
