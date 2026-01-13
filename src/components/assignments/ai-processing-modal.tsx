"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import type { AIAssignmentResult } from "@/lib/types";

interface AIProcessingModalProps {
  open: boolean;
  onClose: () => void;
  isProcessing: boolean;
  result: AIAssignmentResult | null;
  pendingCount: number;
}

export function AIProcessingModal({
  open,
  onClose,
  isProcessing,
  result,
  pendingCount,
}: AIProcessingModalProps) {
  const assignedCount = result?.assignments?.length ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => !open && !isProcessing && onClose()}
    >
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-[360px] p-4 sm:max-w-md sm:p-6"
        showCloseButton={!isProcessing}
      >
        <DialogHeader className="text-left space-y-1.5 sm:space-y-2">
          <DialogTitle className="flex items-center gap-1.5 text-base sm:gap-2 sm:text-lg">
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary sm:h-5 sm:w-5" />
                <span className="leading-tight">AI is assigning drivers...</span>
              </>
            ) : result?.success ? (
              <>
                <CheckCircle className="h-4 w-4 shrink-0 text-green-600 sm:h-5 sm:w-5" />
                <span>Assignment Complete</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 shrink-0 text-destructive sm:h-5 sm:w-5" />
                <span>Assignment Failed</span>
              </>
            )}
          </DialogTitle>
          {isProcessing ? (
            <DialogDescription className="text-xs sm:text-sm">
              Please wait while AI analyzes driver availability and assigns
              trips.
            </DialogDescription>
          ) : result?.success && result.summary ? (
            <ScrollArea className="max-h-16 sm:max-h-20">
              <DialogDescription className="break-words pr-2 text-xs leading-relaxed sm:pr-3 sm:text-sm">
                {result.summary}
              </DialogDescription>
            </ScrollArea>
          ) : null}
        </DialogHeader>

        <div className="py-1 space-y-3 sm:py-2 sm:space-y-4">
          {isProcessing ? (
            <ProcessingState pendingCount={pendingCount} />
          ) : result?.success ? (
            <SuccessState
              assignedCount={assignedCount}
              pendingCount={pendingCount}
              warnings={result.warnings}
            />
          ) : (
            <ErrorState error={result?.error} />
          )}
        </div>

        <DialogFooter className="mt-2 sm:mt-0">
          {!isProcessing && (
            <Button
              onClick={onClose}
              className="w-full text-sm sm:w-auto sm:text-base"
              size="sm"
            >
              {result?.success ? "Done" : "Close"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProcessingState({ pendingCount }: { pendingCount: number }) {
  return (
    <div className="space-y-2 sm:space-y-3">
      <Progress value={undefined} className="h-1.5 sm:h-2" />
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-sm">
        <span>Processing {pendingCount} trips...</span>
        <span className="text-muted-foreground/70 sm:text-muted-foreground">
          This may take a moment
        </span>
      </div>
    </div>
  );
}

function SuccessState({
  assignedCount,
  pendingCount,
  warnings,
}: {
  assignedCount: number;
  pendingCount: number;
  warnings?: string[];
}) {
  const unassignedCount = pendingCount - assignedCount;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="rounded-lg border border-green-200 bg-green-50 p-2 text-center sm:p-3">
          <p className="text-lg font-semibold text-green-700 sm:text-2xl">
            {assignedCount}
          </p>
          <p className="text-[10px] text-green-600 sm:text-sm">Assigned</p>
        </div>
        <div className="rounded-lg border bg-muted p-2 text-center sm:p-3">
          <p className="text-lg font-semibold sm:text-2xl">{unassignedCount}</p>
          <p className="text-[10px] text-muted-foreground sm:text-sm">
            {unassignedCount === 0 ? "None remaining" : "Could not assign"}
          </p>
        </div>
      </div>

      {/* Warnings Section */}
      {warnings && warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 sm:p-3 overflow-hidden">
          <div className="flex items-center gap-1 text-amber-700 sm:gap-2 mb-1.5 sm:mb-2">
            <AlertTriangle className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
            <span className="text-[11px] font-medium sm:text-sm">
              Warnings ({warnings.length})
            </span>
          </div>
          <div className="h-20 sm:h-28 overflow-hidden">
            <ScrollArea className="h-full w-full">
              <div className="pr-3 sm:pr-4">
                <ul className="text-[10px] text-amber-600 space-y-1 leading-relaxed sm:text-xs sm:space-y-1.5">
                  {warnings.map((warning, index) => (
                    <li
                      key={index}
                      className="break-all whitespace-normal overflow-hidden"
                    >
                      <span className="break-words">{`• ${warning}`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorState({ error }: { error?: string }) {
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2 sm:p-3">
      <ScrollArea className="max-h-24 sm:max-h-32">
        <p className="text-[11px] text-destructive break-words leading-relaxed pr-2 sm:text-sm sm:pr-3">
          {error || "An unexpected error occurred during assignment."}
        </p>
      </ScrollArea>
    </div>
  );
}
