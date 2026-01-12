"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResponse, Trip, CSVImportResult } from "@/lib/types";

// ============================================
// VALIDATION SCHEMAS
// ============================================

const tripSchema = z.object({
  tripId: z.string().startsWith("T-", "Trip ID must start with T-"),
  tripDate: z.coerce.date(),
});

// ============================================
// GET TRIPS
// ============================================

export async function getTrips(): Promise<ActionResponse<Trip[]>> {
  try {
    const trips = await prisma.trip.findMany({
      include: { assignment: { include: { driver: true } } },
      orderBy: { tripDate: "asc" },
    });

    return { success: true, data: trips as Trip[] };
  } catch (error) {
    console.error("Failed to fetch trips:", error);
    return { success: false, error: "Failed to fetch trips" };
  }
}

// ============================================
// GET SINGLE TRIP
// ============================================

export async function getTrip(id: string): Promise<ActionResponse<Trip>> {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { assignment: { include: { driver: true } } },
    });

    if (!trip) {
      return { success: false, error: "Trip not found" };
    }

    return { success: true, data: trip as Trip };
  } catch (error) {
    console.error("Failed to fetch trip:", error);
    return { success: false, error: "Failed to fetch trip" };
  }
}

// ============================================
// CREATE TRIP
// ============================================

export async function createTrip(
  formData: FormData
): Promise<ActionResponse<Trip>> {
  try {
    const tripId = formData.get("tripId") as string;
    const tripDate = new Date(formData.get("tripDate") as string);

    const validated = tripSchema.safeParse({ tripId, tripDate });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const dayOfWeek = validated.data.tripDate.getDay();

    // Check if trip already exists
    const existing = await prisma.trip.findFirst({
      where: { tripId: validated.data.tripId },
    });

    if (existing) {
      return { success: false, error: "Trip ID already exists" };
    }

    const trip = await prisma.trip.create({
      data: {
        tripId: validated.data.tripId,
        tripDate: validated.data.tripDate,
        dayOfWeek,
        tripStage: "Upcoming",
      },
    });

    revalidatePath("/dashboard/trips");
    revalidatePath("/dashboard");

    return { success: true, data: trip as Trip };
  } catch (error) {
    console.error("Failed to create trip:", error);
    return { success: false, error: "Failed to create trip" };
  }
}

// ============================================
// IMPORT TRIPS FROM CSV
// ============================================

export async function importTripsFromCSV(
  trips: {
    tripId: string;
    tripDate: Date;
    dayOfWeek: number;
  }[]
): Promise<ActionResponse<CSVImportResult>> {
  try {
    let imported = 0;
    let skipped = 0;

    for (const trip of trips) {
      const existing = await prisma.trip.findFirst({
        where: { tripId: trip.tripId },
      });

      if (!existing) {
        await prisma.trip.create({
          data: {
            tripId: trip.tripId,
            tripDate: trip.tripDate,
            dayOfWeek: trip.dayOfWeek,
            tripStage: "Upcoming",
          },
        });
        imported++;
      } else {
        skipped++;
      }
    }

    revalidatePath("/dashboard/trips");
    revalidatePath("/dashboard");

    return { success: true, data: { imported, skipped } };
  } catch (error) {
    console.error("Failed to import trips:", error);
    return { success: false, error: "Failed to import trips" };
  }
}

// ============================================
// DELETE TRIP
// ============================================

export async function deleteTrip(
  id: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    await prisma.trip.delete({ where: { id } });

    revalidatePath("/dashboard/trips");
    revalidatePath("/dashboard");

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Failed to delete trip:", error);
    return { success: false, error: "Failed to delete trip" };
  }
}

// ============================================
// GET TRIPS BY DATE RANGE
// ============================================

export async function getTripsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<ActionResponse<Trip[]>> {
  try {
    const trips = await prisma.trip.findMany({
      where: {
        tripDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { assignment: { include: { driver: true } } },
      orderBy: { tripDate: "asc" },
    });

    return { success: true, data: trips as Trip[] };
  } catch (error) {
    console.error("Failed to fetch trips by date range:", error);
    return { success: false, error: "Failed to fetch trips" };
  }
}
