"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TripForm } from "@/components/trips/trip-form";
import { TripDialog } from "@/components/trips/trip-dialog";
import { TripTable } from "@/components/trips/trip-table";
import { CSVImport } from "@/components/trips/csv-import";
import { CSVPreview } from "@/components/trips/csv-preview";
import { useCreateTrip, useImportTrips } from "@/hooks/use-trips";
import type { CSVParseResult } from "@/lib/csv-parser";
import { FileSpreadsheet, PenLine, Plus } from "lucide-react";

export default function TripsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("manual");
  const [csvResult, setCsvResult] = useState<CSVParseResult | null>(null);

  const createTrip = useCreateTrip();
  const importTrips = useImportTrips();

  const handleManualSubmit = async (values: { tripId: string; tripDate: Date }) => {
    await createTrip.mutateAsync({
      tripId: values.tripId,
      tripDate: values.tripDate.toISOString(),
    });
  };

  const handleCSVParsed = (result: CSVParseResult) => {
    setCsvResult(result);
  };

  const handleCSVImport = async () => {
    if (!csvResult) return;

    await importTrips.mutateAsync(csvResult.trips);
    setCsvResult(null);
  };

  const handleCSVCancel = () => {
    setCsvResult(null);
  };

  return (
    <>
      <DashboardHeader
        title="Trips"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Trips" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-8 p-4 md:p-6 lg:p-8">
        {/* Page Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Trips
            </h1>
            <p className="text-muted-foreground">
              Manage trips and import from CSV
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Trip
          </Button>
        </div>

        {/* Add Trip Card with Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Add Trips</CardTitle>
            <CardDescription>
              Add trips manually or import from a CSV file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="manual">
                  <PenLine className="mr-2 h-4 w-4" />
                  Manual Entry
                </TabsTrigger>
                <TabsTrigger value="csv">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Import CSV
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="pt-6">
                <div className="max-w-2xl">
                  <TripForm
                    onSubmit={handleManualSubmit}
                    isLoading={createTrip.isPending}
                  />
                </div>
              </TabsContent>

              <TabsContent value="csv" className="pt-6">
                <div className="max-w-2xl">
                  {csvResult ? (
                    <CSVPreview
                      result={csvResult}
                      onImport={handleCSVImport}
                      onCancel={handleCSVCancel}
                      isImporting={importTrips.isPending}
                    />
                  ) : (
                    <CSVImport
                      onParsed={handleCSVParsed}
                      isLoading={importTrips.isPending}
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Trips Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Trips</CardTitle>
            <CardDescription>
              View and manage all your scheduled trips
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TripTable />
          </CardContent>
        </Card>
      </div>

      {/* Add Trip Dialog */}
      <TripDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
