"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseTripsCSV, validateCSVColumns, type CSVParseResult } from "@/lib/csv-parser";

interface CSVImportProps {
  onParsed: (result: CSVParseResult) => void;
  isLoading?: boolean;
}

export function CSVImport({ onParsed, isLoading }: CSVImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // Validate file type
      if (!file.name.endsWith(".csv")) {
        setError("Please upload a CSV file");
        return;
      }

      setIsParsing(true);

      try {
        // Validate columns first
        const validation = await validateCSVColumns(file);
        if (!validation.valid) {
          setError(
            `Missing required columns: ${validation.missingColumns.join(", ")}`
          );
          setIsParsing(false);
          return;
        }

        // Parse the CSV
        const result = await parseTripsCSV(file);

        if (result.trips.length === 0) {
          setError("No valid trips found in the CSV file");
          setIsParsing(false);
          return;
        }

        onParsed(result);
      } catch (err) {
        setError("Failed to parse CSV file. Please check the file format.");
        console.error("CSV parse error:", err);
      } finally {
        setIsParsing(false);
      }
    },
    [onParsed]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const disabled = isLoading || isParsing;

  return (
    <div className="space-y-4">
      <div
        onClick={disabled ? undefined : handleClick}
        onDragOver={disabled ? undefined : handleDragOver}
        onDragLeave={disabled ? undefined : handleDragLeave}
        onDrop={disabled ? undefined : handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragging && "border-primary bg-muted/50",
          !disabled && !isDragging && "cursor-pointer hover:border-primary/50 hover:bg-muted/30",
          disabled && "cursor-not-allowed opacity-60",
          error && "border-destructive/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className={cn(
              "rounded-full p-4",
              isDragging ? "bg-primary/10" : "bg-muted"
            )}
          >
            {isParsing ? (
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground animate-pulse" />
            ) : (
              <Upload
                className={cn(
                  "h-8 w-8",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )}
              />
            )}
          </div>

          <div>
            <p className="font-medium">
              {isParsing
                ? "Parsing CSV file..."
                : isDragging
                  ? "Drop your file here"
                  : "Drag & drop your CSV file here"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isParsing ? "Please wait..." : "or click to browse"}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        <p className="font-medium mb-1">Expected columns:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Trip ID</li>
          <li>Stop 1 Planned Arrival Date</li>
          <li>Trip Stage</li>
        </ul>
      </div>
    </div>
  );
}
