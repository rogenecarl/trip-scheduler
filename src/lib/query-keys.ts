// ============================================
// TANSTACK QUERY KEYS
// ============================================
// Centralized query key factory for consistent cache management

export const queryKeys = {
  // Drivers
  drivers: {
    all: ["drivers"] as const,
    list: () => [...queryKeys.drivers.all, "list"] as const,
    detail: (id: string) => [...queryKeys.drivers.all, "detail", id] as const,
    available: (dayOfWeek: number) =>
      [...queryKeys.drivers.all, "available", dayOfWeek] as const,
  },

  // Trips
  trips: {
    all: ["trips"] as const,
    list: () => [...queryKeys.trips.all, "list"] as const,
    detail: (id: string) => [...queryKeys.trips.all, "detail", id] as const,
    byDate: (date: string) => [...queryKeys.trips.all, "byDate", date] as const,
    pending: () => [...queryKeys.trips.all, "pending"] as const,
  },

  // Assignments
  assignments: {
    all: ["assignments"] as const,
    list: () => [...queryKeys.assignments.all, "list"] as const,
    stats: () => [...queryKeys.assignments.all, "stats"] as const,
    byDriver: (driverId: string) =>
      [...queryKeys.assignments.all, "byDriver", driverId] as const,
  },

  // Dashboard
  dashboard: {
    all: ["dashboard"] as const,
    stats: () => [...queryKeys.dashboard.all, "stats"] as const,
    pendingTrips: () => [...queryKeys.dashboard.all, "pendingTrips"] as const,
    recentActivity: () => [...queryKeys.dashboard.all, "recentActivity"] as const,
  },

  // Calendar
  calendar: {
    all: ["calendar"] as const,
    month: (year: number, month: number) =>
      [...queryKeys.calendar.all, "month", year, month] as const,
    day: (date: string) => [...queryKeys.calendar.all, "day", date] as const,
  },

  // Chat
  chat: {
    all: ["chat"] as const,
    sessions: () => [...queryKeys.chat.all, "sessions"] as const,
    messages: (sessionId: string) =>
      [...queryKeys.chat.all, "messages", sessionId] as const,
  },

  // Uploads
  uploads: {
    all: ["uploads"] as const,
    list: () => [...queryKeys.uploads.all, "list"] as const,
    detail: (id: string) => [...queryKeys.uploads.all, "detail", id] as const,
  },
} as const;

// Type helper - simple readonly array type
export type QueryKey = readonly (string | number)[];
