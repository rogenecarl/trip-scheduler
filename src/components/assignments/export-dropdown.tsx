"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Copy, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { DAY_NAMES } from "@/lib/types";
import type { Trip } from "@/lib/types";

interface ExportDropdownProps {
  assignments: Trip[];
  disabled?: boolean;
}

export function ExportDropdown({ assignments, disabled }: ExportDropdownProps) {
  const handleExportCSV = () => {
    if (!assignments || assignments.length === 0) {
      toast.error("No assignments to export");
      return;
    }

    const headers = ["Trip ID", "Date", "Day", "Driver", "AI Reasoning"];
    const rows = assignments.map((trip) => [
      trip.tripId,
      format(new Date(trip.tripDate), "yyyy-MM-dd"),
      DAY_NAMES[trip.dayOfWeek],
      trip.assignment?.driver?.name || "Unassigned",
      trip.assignment?.aiReasoning || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            // Escape quotes and wrap in quotes if contains comma or newline
            const escaped = String(cell).replace(/"/g, '""');
            if (escaped.includes(",") || escaped.includes("\n") || escaped.includes('"')) {
              return `"${escaped}"`;
            }
            return escaped;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `assignments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Exported to CSV");
  };

  const handleCopyToClipboard = async () => {
    if (!assignments || assignments.length === 0) {
      toast.error("No assignments to copy");
      return;
    }

    const headers = "Trip ID\tDate\tDay\tDriver";
    const rows = assignments
      .map(
        (trip) =>
          `${trip.tripId}\t${format(new Date(trip.tripDate), "yyyy-MM-dd")}\t${DAY_NAMES[trip.dayOfWeek]}\t${trip.assignment?.driver?.name || "Unassigned"}`
      )
      .join("\n");

    const content = `${headers}\n${rows}`;

    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled} className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export to CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyToClipboard}>
          <Copy className="mr-2 h-4 w-4" />
          Copy to Clipboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
