"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResponse, Driver } from "@/lib/types";

// ============================================
// VALIDATION SCHEMAS
// ============================================

const driverSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  availability: z.array(z.number().min(0).max(6)).min(1, "Select at least one day"),
});

// ============================================
// GET DRIVERS
// ============================================

export async function getDrivers(): Promise<ActionResponse<Driver[]>> {
  try {
    const drivers = await prisma.driver.findMany({
      where: { isActive: true },
      include: { availability: true },
      orderBy: { name: "asc" },
    });

    return { success: true, data: drivers as Driver[] };
  } catch (error) {
    console.error("Failed to fetch drivers:", error);
    return { success: false, error: "Failed to fetch drivers" };
  }
}

// ============================================
// GET SINGLE DRIVER
// ============================================

export async function getDriver(id: string): Promise<ActionResponse<Driver>> {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: { availability: true },
    });

    if (!driver) {
      return { success: false, error: "Driver not found" };
    }

    return { success: true, data: driver as Driver };
  } catch (error) {
    console.error("Failed to fetch driver:", error);
    return { success: false, error: "Failed to fetch driver" };
  }
}

// ============================================
// CREATE DRIVER
// ============================================

export async function createDriver(
  formData: FormData
): Promise<ActionResponse<Driver>> {
  try {
    const name = formData.get("name") as string;
    const availability = JSON.parse(formData.get("availability") as string);

    const validated = driverSchema.safeParse({ name, availability });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const driver = await prisma.driver.create({
      data: {
        name: validated.data.name,
        availability: {
          create: validated.data.availability.map((day: number) => ({
            dayOfWeek: day,
            isAvailable: true,
          })),
        },
      },
      include: { availability: true },
    });

    revalidatePath("/dashboard/drivers");
    revalidatePath("/dashboard");

    return { success: true, data: driver as Driver };
  } catch (error) {
    console.error("Failed to create driver:", error);
    return { success: false, error: "Failed to create driver" };
  }
}

// ============================================
// UPDATE DRIVER
// ============================================

export async function updateDriver(
  id: string,
  formData: FormData
): Promise<ActionResponse<Driver>> {
  try {
    const name = formData.get("name") as string;
    const availability = JSON.parse(formData.get("availability") as string);

    const validated = driverSchema.safeParse({ name, availability });
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    // Delete existing availability and recreate
    await prisma.driverAvailability.deleteMany({ where: { driverId: id } });

    const driver = await prisma.driver.update({
      where: { id },
      data: {
        name: validated.data.name,
        availability: {
          create: validated.data.availability.map((day: number) => ({
            dayOfWeek: day,
            isAvailable: true,
          })),
        },
      },
      include: { availability: true },
    });

    revalidatePath("/dashboard/drivers");
    revalidatePath("/dashboard/assignments");

    return { success: true, data: driver as Driver };
  } catch (error) {
    console.error("Failed to update driver:", error);
    return { success: false, error: "Failed to update driver" };
  }
}

// ============================================
// DELETE DRIVER (Soft Delete)
// ============================================

export async function deleteDriver(
  id: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    await prisma.driver.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/dashboard/drivers");
    revalidatePath("/dashboard");

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Failed to delete driver:", error);
    return { success: false, error: "Failed to delete driver" };
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
