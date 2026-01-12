"use server";

import prisma from "@/lib/prisma";
import { genAI, MODEL_NAME } from "@/lib/gemini";
import type { ActionResponse } from "@/lib/types";

// ============================================
// SEND CHAT MESSAGE
// ============================================

export async function sendChatMessage(
  message: string
): Promise<ActionResponse<string>> {
  try {
    // Get current context
    const [drivers, trips, stats] = await Promise.all([
      prisma.driver.findMany({
        where: { isActive: true },
        include: { availability: true },
      }),
      prisma.trip.findMany({
        where: { tripStage: "Upcoming" },
        include: { assignment: { include: { driver: true } } },
      }),
      getStats(),
    ]);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const prompt = `
You are Trip Scheduler AI assistant for Peak Transport.

CONTEXT:
- Total Drivers: ${drivers.length}
- Total Trips: ${stats.total}
- Assigned: ${stats.assigned}
- Pending: ${stats.pending}

DRIVERS:
${JSON.stringify(
  drivers.map((d) => ({
    name: d.name,
    availableDays: d.availability
      .filter((a) => a.isAvailable)
      .map((a) => dayNames[a.dayOfWeek]),
  })),
  null,
  2
)}

TRIPS:
${JSON.stringify(
  trips.slice(0, 20).map((t) => ({
    tripId: t.tripId,
    date: t.tripDate.toISOString().split("T")[0],
    day: dayNames[t.dayOfWeek],
    driver: t.assignment?.driver?.name || "Unassigned",
  })),
  null,
  2
)}

USER QUESTION: ${message}

Respond helpfully and concisely. Reference actual data when possible.
If user wants to make changes, explain what actions to take in the app.
`;

    const response = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return { success: true, data: response.text || "" };
  } catch (error) {
    console.error("Chat error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get response",
    };
  }
}

// ============================================
// HELPER: GET STATS
// ============================================

async function getStats() {
  const [total, assigned, pending] = await Promise.all([
    prisma.trip.count({ where: { tripStage: "Upcoming" } }),
    prisma.trip.count({
      where: { tripStage: "Upcoming", assignment: { isNot: null } },
    }),
    prisma.trip.count({
      where: { tripStage: "Upcoming", assignment: null },
    }),
  ]);
  return { total, assigned, pending };
}

// ============================================
// SAVE CHAT MESSAGE (Optional persistence)
// ============================================

export async function saveChatMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    const message = await prisma.chatMessage.create({
      data: {
        sessionId,
        role,
        content,
      },
    });

    return { success: true, data: { id: message.id } };
  } catch (error) {
    console.error("Failed to save chat message:", error);
    return { success: false, error: "Failed to save message" };
  }
}

// ============================================
// GET CHAT HISTORY
// ============================================

export async function getChatHistory(
  sessionId: string
): Promise<
  ActionResponse<{ id: string; role: string; content: string; createdAt: Date }[]>
> {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    return { success: true, data: messages };
  } catch (error) {
    console.error("Failed to fetch chat history:", error);
    return { success: false, error: "Failed to fetch chat history" };
  }
}
