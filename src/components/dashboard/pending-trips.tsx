"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, Package } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DAY_NAMES_SHORT, DATE_FORMAT } from "@/lib/constants";
import type { Trip } from "@/lib/types";

interface PendingTripsProps {
  trips?: Trip[];
  isLoading?: boolean;
}

export function PendingTrips({ trips, isLoading }: PendingTripsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-medium">
          Pending Assignments
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/assignments" className="text-sm">
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PendingTripsLoading />
        ) : !trips || trips.length === 0 ? (
          <PendingTripsEmpty />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium">Trip ID</TableHead>
                  <TableHead className="font-medium">Date</TableHead>
                  <TableHead className="font-medium">Day</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="text-right font-medium">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => (
                  <TableRow key={trip.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">
                      {trip.tripId}
                    </TableCell>
                    <TableCell>
                      {format(new Date(trip.tripDate), DATE_FORMAT)}
                    </TableCell>
                    <TableCell>{DAY_NAMES_SHORT[trip.dayOfWeek]}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200"
                      >
                        Pending
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/assignments?trip=${trip.id}`}>
                          Assign
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PendingTripsEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="rounded-full bg-muted p-3 mb-3">
        <Package className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium mb-1">No pending trips</h3>
      <p className="text-xs text-muted-foreground max-w-[200px]">
        All trips have been assigned or there are no trips to assign.
      </p>
    </div>
  );
}

function PendingTripsLoading() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-16 ml-auto" />
        </div>
      ))}
    </div>
  );
}
