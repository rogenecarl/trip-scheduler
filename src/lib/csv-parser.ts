import Papa from "papaparse";
import { getDay, parse, isValid } from "date-fns";
import type { ParsedTrip } from "./types";

// ============================================
// CSV ROW INTERFACE
// ============================================

interface CSVRow {
  "Trip ID": string;
  "Stop 1 Planned Arrival Date": string;
  "Trip Stage": string;
}

// ============================================
// DATE PARSING
// ============================================

// Supported date formats for flexible CSV parsing
const DATE_FORMATS = [
  "M/d/yy", // 1/15/26
  "MM/dd/yy", // 01/15/26
  "M/d/yyyy", // 1/15/2026
  "MM/dd/yyyy", // 01/15/2026
  "yyyy-MM-dd", // 2026-01-15 (ISO)
  "dd/MM/yyyy", // 15/01/2026 (European)
  "dd-MM-yyyy", // 15-01-2026
  "MMM d, yyyy", // Jan 15, 2026
  "MMMM d, yyyy", // January 15, 2026
] as const;

/**
 * Parses a date string trying multiple formats
 * Returns null if no format matches
 */
function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;

  const trimmed = dateStr.trim();

  // Try each format until one works
  for (const format of DATE_FORMATS) {
    try {
      const parsed = parse(trimmed, format, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      // Continue to next format
    }
  }

  // Fallback: try native Date parsing for ISO strings
  const nativeDate = new Date(trimmed);
  if (isValid(nativeDate)) {
    return nativeDate;
  }

  return null;
}

// ============================================
// CSV PARSING
// ============================================

export interface CSVParseResult {
  trips: ParsedTrip[];
  errors: string[];
  skippedCanceled: number;
  skippedDuplicate: number;
  skippedInvalidDate: number;
}

/**
 * Parses a CSV file and extracts trip data
 * Groups by Trip ID (duplicates = 1 trip)
 * Skips canceled trips
 */
export function parseTripsCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const trips = new Map<string, ParsedTrip>();
        const errors: string[] = [];
        let skippedCanceled = 0;
        let skippedDuplicate = 0;
        let skippedInvalidDate = 0;

        for (const row of results.data) {
          // Skip canceled trips
          if (row["Trip Stage"] === "Canceled") {
            skippedCanceled++;
            continue;
          }

          const tripId = row["Trip ID"];
          if (!tripId) continue;

          // Skip duplicates (same Trip ID = same trip)
          if (trips.has(tripId)) {
            skippedDuplicate++;
            continue;
          }

          const dateStr = row["Stop 1 Planned Arrival Date"];
          const tripDate = parseFlexibleDate(dateStr);

          if (!tripDate) {
            errors.push(`Invalid date format for trip ${tripId}: "${dateStr}"`);
            skippedInvalidDate++;
            continue;
          }

          trips.set(tripId, {
            tripId,
            tripDate,
            dayOfWeek: getDay(tripDate),
          });
        }

        if (errors.length > 0) {
          console.warn("CSV parsing warnings:", errors);
        }

        resolve({
          trips: Array.from(trips.values()),
          errors,
          skippedCanceled,
          skippedDuplicate,
          skippedInvalidDate,
        });
      },
      error: (error) => reject(error),
    });
  });
}

/**
 * Validates that a CSV file has the required columns
 */
export function validateCSVColumns(file: File): Promise<{
  valid: boolean;
  missingColumns: string[];
}> {
  const requiredColumns = ["Trip ID", "Stop 1 Planned Arrival Date", "Trip Stage"];

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      preview: 1, // Only parse first row to get headers
      complete: (results) => {
        const headers = results.meta.fields || [];
        const missingColumns = requiredColumns.filter(
          (col) => !headers.includes(col)
        );

        resolve({
          valid: missingColumns.length === 0,
          missingColumns,
        });
      },
      error: (error) => reject(error),
    });
  });
}
