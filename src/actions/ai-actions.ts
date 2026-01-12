"use server";

import prisma from "@/lib/prisma";
import { genAI, MODEL_NAME } from "@/lib/gemini";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AIAssignmentResult } from "@/lib/types";

// ============================================
// VALIDATION SCHEMAS
// ============================================

const AIAssignmentSchema = z.object({
  tripId: z.string().min(1, "tripId is required"),
  driverId: z.string().min(1, "driverId is required"),
  reasoning: z.string().default("No reasoning provided"),
});

const AIResponseSchema = z.object({
  assignments: z.array(AIAssignmentSchema),
  summary: z.string().optional(),
  warnings: z.array(z.string()).optional().default([]),
});

type AIResponse = z.infer<typeof AIResponseSchema>;

// ============================================
// AI RESPONSE PARSING (Robust)
// ============================================

/**
 * Extracts and validates JSON from AI response text
 * Handles markdown code blocks, raw JSON, and malformed responses
 */
function parseAIResponse(text: string): AIResponse {
  if (!text || typeof text !== "string") {
    throw new Error("Empty response from AI");
  }

  // Patterns to try (in order of preference)
  const patterns = [
    /```json\s*([\s\S]*?)\s*```/, // ```json ... ```
    /```\s*([\s\S]*?)\s*```/, // ``` ... ```
    /(\{[\s\S]*"assignments"[\s\S]*\})/, // Object with assignments key
  ];

  let jsonStr = text.trim();

  // Try each pattern to extract JSON
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      jsonStr = match[1].trim();
      break;
    }
  }

  // Attempt to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Try to fix common JSON issues
    try {
      // Remove trailing commas before ] or }
      const fixed = jsonStr.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}");
      parsed = JSON.parse(fixed);
    } catch {
      throw new Error(
        `Failed to parse AI response as JSON. ` +
          `Raw response: ${text.substring(0, 200)}...`
      );
    }
  }

  // Validate structure with zod
  const result = AIResponseSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new Error(`Invalid AI response structure: ${issues}`);
  }

  return result.data;
}

// ============================================
// BUILD PROMPT
// ============================================

function buildAssignmentPrompt(
  trips: { id: string; tripId: string; tripDate: Date; dayOfWeek: number }[],
  drivers: {
    id: string;
    name: string;
    availability: { dayOfWeek: number }[];
  }[]
) {
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const driversData = drivers.map((d) => ({
    id: d.id,
    name: d.name,
    availableDays: d.availability.map((a) => dayNames[a.dayOfWeek]),
  }));

  const tripsData = trips.map((t) => ({
    id: t.id,
    tripId: t.tripId,
    date: t.tripDate.toISOString().split("T")[0],
    dayOfWeek: dayNames[t.dayOfWeek],
  }));

  return `You are a fleet scheduling assistant for Peak Transport.

TASK: Assign drivers to trips based on availability.

RULES:
1. Only assign a driver if they are available on the trip's day of week
2. Balance workload - try to give each driver a similar number of trips
3. Provide a brief reasoning for each assignment
4. If no driver is available for a trip, do not include it in assignments

DRIVERS:
${JSON.stringify(driversData, null, 2)}

TRIPS TO ASSIGN:
${JSON.stringify(tripsData, null, 2)}

OUTPUT FORMAT (JSON only, no markdown code blocks):
{
  "assignments": [
    {"tripId": "trip-db-id", "driverId": "driver-db-id", "reasoning": "brief reason"}
  ],
  "summary": "Assigned X trips to Y drivers",
  "warnings": ["any issues or unassigned trips"]
}

Respond with only valid JSON, no additional text.`;
}

// ============================================
// MAIN AUTO-ASSIGN FUNCTION
// ============================================

export async function autoAssignDrivers(): Promise<AIAssignmentResult> {
  try {
    // Fetch unassigned trips
    const trips = await prisma.trip.findMany({
      where: { assignment: null, tripStage: "Upcoming" },
      select: { id: true, tripId: true, tripDate: true, dayOfWeek: true },
    });

    if (trips.length === 0) {
      return {
        success: true,
        summary: "No unassigned trips to process",
        assignments: [],
      };
    }

    // Fetch active drivers with availability
    const drivers = await prisma.driver.findMany({
      where: { isActive: true },
      include: { availability: { where: { isAvailable: true } } },
    });

    if (drivers.length === 0) {
      return { success: false, error: "No active drivers available" };
    }

    // Build prompt
    const prompt = buildAssignmentPrompt(trips, drivers);

    // Call Gemini AI
    const response = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    const text = response.text || "";

    // Parse and validate AI response
    const parsed = parseAIResponse(text);

    // Validate that tripIds and driverIds exist in our data
    const tripIdSet = new Set(trips.map((t) => t.id));
    const driverIdSet = new Set(drivers.map((d) => d.id));
    const warnings: string[] = [...(parsed.warnings || [])];

    const validAssignments = parsed.assignments.filter((a) => {
      if (!tripIdSet.has(a.tripId)) {
        warnings.push(`Skipped invalid trip ID: ${a.tripId}`);
        return false;
      }
      if (!driverIdSet.has(a.driverId)) {
        warnings.push(`Skipped invalid driver ID: ${a.driverId}`);
        return false;
      }
      return true;
    });

    // Create assignments in database (use transaction for atomicity)
    await prisma.$transaction(
      validAssignments.map((assignment) =>
        prisma.tripAssignment.create({
          data: {
            tripId: assignment.tripId,
            driverId: assignment.driverId,
            isAutoAssigned: true,
            aiReasoning: assignment.reasoning,
          },
        })
      )
    );

    revalidatePath("/dashboard/assignments");
    revalidatePath("/dashboard/trips");
    revalidatePath("/dashboard");

    return {
      success: true,
      assignments: validAssignments,
      summary: parsed.summary || `Assigned ${validAssignments.length} trips`,
      warnings,
    };
  } catch (error) {
    console.error("AI Assignment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
