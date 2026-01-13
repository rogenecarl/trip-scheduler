"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AIProcessingModal } from "./ai-processing-modal";
import { useAIAssign } from "@/hooks/use-assignments";
import type { AIAssignmentResult } from "@/lib/types";

interface AutoAssignButtonProps {
  pendingCount: number;
}

export function AutoAssignButton({ pendingCount }: AutoAssignButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [result, setResult] = useState<AIAssignmentResult | null>(null);
  const aiAssign = useAIAssign();

  const handleAutoAssign = async () => {
    setResult(null);
    setIsModalOpen(true);

    const assignmentResult = await aiAssign.mutateAsync();
    setResult(assignmentResult);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setResult(null);
  };

  return (
    <>
      <Button
        onClick={handleAutoAssign}
        disabled={pendingCount === 0 || aiAssign.isPending}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        Auto-Assign with AI
      </Button>

      <AIProcessingModal
        open={isModalOpen}
        onClose={handleModalClose}
        isProcessing={aiAssign.isPending}
        result={result}
        pendingCount={pendingCount}
      />
    </>
  );
}
