"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type {
  ActionResponse,
  Trip,
  TripAssignment,
  AssignmentStats,
  Driver,
} from "@/lib/types";

// ============================================
// GET ASSIGNMENTS
// ============================================

export async function getAssignments(): Promise<ActionResponse<Trip[]>> {
  try {
    const assignments = await prisma.trip.findMany({
      where: { tripStage: "Upcoming" },
      include: {
        assignment: {
          include: { driver: true },
        },
      },
      orderBy: { tripDate: "asc" },
    });

    return { success: true, data: assignments as Trip[] };
  } catch (error) {
    console.error("Failed to fetch assignments:", error);
    return { success: false, error: "Failed to fetch assignments" };
  }
}

// ============================================
// GET ASSIGNMENT STATS
// ============================================

export async function getAssignmentStats(): Promise<
  ActionResponse<AssignmentStats>
> {
  try {
    const [total, assigned, pending] = await Promise.all([
      prisma.trip.count({ where: { tripStage: "Upcoming" } }),
      prisma.trip.count({
        where: {
          tripStage: "Upcoming",
          assignment: { isNot: null },
        },
      }),
      prisma.trip.count({
        where: {
          tripStage: "Upcoming",
          assignment: null,
        },
      }),
    ]);

    return { success: true, data: { total, assigned, pending } };
  } catch (error) {
    console.error("Failed to fetch assignment stats:", error);
    return { success: false, error: "Failed to fetch stats" };
  }
}

// ============================================
// UPDATE ASSIGNMENT
// ============================================

export async function updateAssignment(
  tripId: string,
  driverId: string | null
): Promise<ActionResponse<TripAssignment | null>> {
  try {
    if (driverId === null) {
      // Remove assignment
      await prisma.tripAssignment.delete({
        where: { tripId },
      });

      revalidatePath("/dashboard/assignments");
      revalidatePath("/dashboard");

      return { success: true, data: null };
    } else {
      // Create or update assignment
      const assignment = await prisma.tripAssignment.upsert({
        where: { tripId },
        create: {
          tripId,
          driverId,
          isAutoAssigned: false,
        },
        update: {
          driverId,
          isAutoAssigned: false,
          aiReasoning: null, // Clear AI reasoning on manual update
        },
        include: { driver: true },
      });

      revalidatePath("/dashboard/assignments");
      revalidatePath("/dashboard");

      return { success: true, data: assignment as TripAssignment };
    }
  } catch (error) {
    console.error("Failed to update assignment:", error);
    return { success: false, error: "Failed to update assignment" };
  }
}

// ============================================
// GET AVAILABLE DRIVERS FOR DAY
// ============================================

export async function getAvailableDriversForDay(
  dayOfWeek: number
): Promise<ActionResponse<Driver[]>> {
  try {
    const drivers = await prisma.driver.findMany({
      where: {
        isActive: true,
        availability: {
          some: {
            dayOfWeek,
            isAvailable: true,
          },
        },
      },
      include: { availability: true },
      orderBy: { name: "asc" },
    });

    return { success: true, data: drivers as Driver[] };
  } catch (error) {
    console.error("Failed to fetch available drivers:", error);
    return { success: false, error: "Failed to fetch available drivers" };
  }
}

// ============================================
// BULK UPDATE ASSIGNMENTS
// ============================================

export async function bulkUpdateAssignments(
  assignments: { tripId: string; driverId: string; reasoning?: string }[]
): Promise<ActionResponse<{ updated: number }>> {
  try {
    await prisma.$transaction(
      assignments.map((assignment) =>
        prisma.tripAssignment.upsert({
          where: { tripId: assignment.tripId },
          create: {
            tripId: assignment.tripId,
            driverId: assignment.driverId,
            isAutoAssigned: true,
            aiReasoning: assignment.reasoning,
          },
          update: {
            driverId: assignment.driverId,
            isAutoAssigned: true,
            aiReasoning: assignment.reasoning,
          },
        })
      )
    );

    revalidatePath("/dashboard/assignments");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/trips");

    return { success: true, data: { updated: assignments.length } };
  } catch (error) {
    console.error("Failed to bulk update assignments:", error);
    return { success: false, error: "Failed to update assignments" };
  }
}
