"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  ActionResponse,
  Trip,
  CSVImportResult,
  CSVImportResultEnhanced,
  TripPaginationParams,
  PaginatedResponse,
} from "@/lib/types";

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
// GET TRIPS PAGINATED
// ============================================

export async function getTripsPaginated(
  params: TripPaginationParams
): Promise<ActionResponse<PaginatedResponse<Trip>>> {
  try {
    const { page, pageSize, search, status } = params;
    const skip = (page - 1) * pageSize;

    // Build where clause with server-side filtering
    const where: Prisma.TripWhereInput = {
      ...(search && {
        tripId: { contains: search, mode: "insensitive" },
      }),
      ...(status === "assigned" && {
        assignment: { isNot: null },
      }),
      ...(status === "pending" && {
        assignment: null,
      }),
    };

    // Execute count and data queries in parallel
    const [totalItems, trips] = await Promise.all([
      prisma.trip.count({ where }),
      prisma.trip.findMany({
        where,
        include: { assignment: { include: { driver: true } } },
        orderBy: { tripDate: "asc" },
        skip,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      success: true,
      data: {
        data: trips as Trip[],
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    };
  } catch (error) {
    console.error("Failed to fetch paginated trips:", error);
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
    tripStage: string;
    plannedArrivalTime: string | null;
  }[]
): Promise<ActionResponse<CSVImportResult>> {
  try {
    // Get all existing trip IDs in a single query (avoid N+1)
    const tripIds = trips.map((t) => t.tripId);
    const existingTrips = await prisma.trip.findMany({
      where: { tripId: { in: tripIds } },
      select: { tripId: true },
    });
    const existingIds = new Set(existingTrips.map((t) => t.tripId));

    // Filter to only new trips
    const newTrips = trips.filter((t) => !existingIds.has(t.tripId));
    const skipped = trips.length - newTrips.length;

    // Bulk insert with createMany (much faster than individual creates)
    if (newTrips.length > 0) {
      await prisma.trip.createMany({
        data: newTrips.map((trip) => ({
          tripId: trip.tripId,
          tripDate: trip.tripDate,
          dayOfWeek: trip.dayOfWeek,
          tripStage: trip.tripStage,
          plannedArrivalTime: trip.plannedArrivalTime,
        })),
        skipDuplicates: true,
      });
    }

    revalidatePath("/dashboard/trips");
    revalidatePath("/dashboard");

    return { success: true, data: { imported: newTrips.length, skipped } };
  } catch (error) {
    console.error("Failed to import trips:", error);
    return { success: false, error: "Failed to import trips" };
  }
}

// ============================================
// IMPORT TRIPS FROM CSV - ENHANCED
// ============================================

export async function importTripsFromCSVEnhanced(
  trips: {
    tripId: string;
    tripDate: Date;
    dayOfWeek: number;
    tripStage: string;
    plannedArrivalTime: string | null;
  }[]
): Promise<ActionResponse<CSVImportResultEnhanced>> {
  try {
    // Get all existing trip IDs in a single query
    const tripIds = trips.map((t) => t.tripId);
    const existingTrips = await prisma.trip.findMany({
      where: { tripId: { in: tripIds } },
      select: { tripId: true },
    });
    const existingIds = new Set(existingTrips.map((t) => t.tripId));

    // Collect duplicate tripIds for user feedback
    const duplicateTripIds = trips
      .filter((t) => existingIds.has(t.tripId))
      .map((t) => t.tripId);

    // Filter to only new trips
    const newTrips = trips.filter((t) => !existingIds.has(t.tripId));

    // Bulk insert with createMany
    if (newTrips.length > 0) {
      try {
        await prisma.trip.createMany({
          data: newTrips.map((trip) => ({
            tripId: trip.tripId,
            tripDate: trip.tripDate,
            dayOfWeek: trip.dayOfWeek,
            tripStage: trip.tripStage,
            plannedArrivalTime: trip.plannedArrivalTime,
          })),
          skipDuplicates: true,
        });
      } catch (dbError) {
        // Handle unique constraint violations gracefully (race condition)
        if (
          dbError instanceof Prisma.PrismaClientKnownRequestError &&
          dbError.code === "P2002"
        ) {
          // Some trips were inserted by another concurrent request
          // Re-fetch to determine what was actually inserted
          const afterInsert = await prisma.trip.findMany({
            where: { tripId: { in: newTrips.map((t) => t.tripId) } },
            select: { tripId: true },
          });
          const insertedCount = afterInsert.length;
          const additionalDuplicates = newTrips
            .filter((t) => !afterInsert.some((a) => a.tripId === t.tripId))
            .map((t) => t.tripId);

          revalidatePath("/dashboard/trips");
          revalidatePath("/dashboard");

          return {
            success: true,
            data: {
              imported: insertedCount,
              skipped: duplicateTripIds.length + additionalDuplicates.length,
              duplicateTripIds: [...duplicateTripIds, ...additionalDuplicates],
            },
          };
        }
        throw dbError;
      }
    }

    revalidatePath("/dashboard/trips");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        imported: newTrips.length,
        skipped: duplicateTripIds.length,
        duplicateTripIds,
      },
    };
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
// BULK DELETE TRIPS
// ============================================

export async function deleteTrips(
  ids: string[]
): Promise<ActionResponse<{ count: number }>> {
  try {
    if (ids.length === 0) {
      return { success: false, error: "No trips selected" };
    }

    const result = await prisma.trip.deleteMany({
      where: { id: { in: ids } },
    });

    revalidatePath("/dashboard/trips");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/assignments");

    return { success: true, data: { count: result.count } };
  } catch (error) {
    console.error("Failed to delete trips:", error);
    return { success: false, error: "Failed to delete trips" };
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
