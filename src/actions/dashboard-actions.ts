"use server";

import prisma from "@/lib/prisma";
import { startOfWeek, endOfWeek } from "date-fns";
import type { ActionResponse, DashboardStats, Trip } from "@/lib/types";

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats(): Promise<ActionResponse<DashboardStats>> {
  try {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    const [totalDrivers, tripsThisWeek, assignedTrips, pendingTrips] =
      await Promise.all([
        prisma.driver.count({ where: { isActive: true } }),
        prisma.trip.count({
          where: {
            tripDate: { gte: weekStart, lte: weekEnd },
            tripStage: "Upcoming",
          },
        }),
        prisma.trip.count({
          where: {
            tripDate: { gte: weekStart, lte: weekEnd },
            tripStage: "Upcoming",
            assignment: { isNot: null },
          },
        }),
        prisma.trip.count({
          where: {
            tripDate: { gte: weekStart, lte: weekEnd },
            tripStage: "Upcoming",
            assignment: null,
          },
        }),
      ]);

    return {
      success: true,
      data: { totalDrivers, tripsThisWeek, assignedTrips, pendingTrips },
    };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return { success: false, error: "Failed to fetch dashboard stats" };
  }
}

// ============================================
// PENDING TRIPS
// ============================================

export async function getPendingTrips(
  limit = 5
): Promise<ActionResponse<Trip[]>> {
  try {
    const trips = await prisma.trip.findMany({
      where: {
        tripStage: "Upcoming",
        assignment: null,
      },
      orderBy: { tripDate: "asc" },
      take: limit,
    });

    return { success: true, data: trips as Trip[] };
  } catch (error) {
    console.error("Failed to fetch pending trips:", error);
    return { success: false, error: "Failed to fetch pending trips" };
  }
}
