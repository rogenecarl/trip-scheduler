/**
 * Fast Trip Assignment Algorithm
 * - Matches trips to drivers by day of week availability
 * - Treats early morning trips (before 5 AM) as previous day's "night shift"
 * - Ensures driver is not double-booked at the same time slot
 * - Checks across midnight (e.g., 23:57 on Day 1 conflicts with 01:11 on Day 2)
 * - A driver CAN do multiple trips if times are far enough apart
 * - Selection priority: 1) Driver priority, 2) Workload balance, 3) Name (A-Z)
 * - No AI = instant results (~1-5ms for 100 trips)
 */

// Minimum hours between trips for the same driver
// Adjust based on business needs:
// - 2 hours: short local trips
// - 3 hours: medium trips with travel
// - 4 hours: long trips or need rest breaks
const MIN_HOURS_BETWEEN_TRIPS = 3;

// Night shift cutoff hour (24-hour format)
// Trips before this hour are treated as belonging to the previous day for availability matching
// Example: A trip at 00:20 Wednesday is treated as a "Tuesday night" shift
// - 5 = 5:00 AM (trips from midnight to 4:59 AM count as previous day)
// - 6 = 6:00 AM (trips from midnight to 5:59 AM count as previous day)
const NIGHT_SHIFT_CUTOFF_HOUR = 5;

type Trip = {
  id: string;
  tripId: string;
  tripDate: Date;
  dayOfWeek: number;
  plannedArrivalTime: string | null; // "HH:MM" or "H:MM" format (e.g., "01:11", "23:57", "7:35")
};

type Driver = {
  id: string;
  name: string;
  priority: number; // 1 = High, 2 = Medium, 3 = Low
  availability: { dayOfWeek: number }[];
};

type Assignment = {
  tripId: string;
  driverId: string;
  reasoning: string;
};

type DriverDistribution = {
  driverId: string;
  driverName: string;
  tripCount: number;
};

type AssignmentResult = {
  assignments: Assignment[];
  warnings: string[];
  summary: string;
  distribution: DriverDistribution[];
  stats: {
    totalTrips: number;
    assignedCount: number;
    unassignedCount: number;
  };
};

// Existing assignment data to pre-populate tracking maps
type ExistingAssignment = {
  driverId: string;
  tripDate: Date;
  plannedArrivalTime: string | null;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Get the effective day of week for availability matching
 * Trips before NIGHT_SHIFT_CUTOFF_HOUR (5 AM) are treated as belonging to the previous day
 * Example: 00:20 Wednesday → Tuesday (since it's a "Tuesday night" shift)
 * Example: 05:00 Wednesday → Wednesday (5 AM or later = current day)
 */
function getEffectiveDayOfWeek(dayOfWeek: number, time: string | null): number {
  const parsed = parseTime(time);

  // If no time or time is at/after cutoff, use calendar day
  if (!parsed || parsed.hours >= NIGHT_SHIFT_CUTOFF_HOUR) {
    return dayOfWeek;
  }

  // Time is before cutoff (e.g., 00:20) - treat as previous day
  // Wrap from Sunday (0) to Saturday (6)
  return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
}

/**
 * Parse time string "HH:MM" or "H:MM" to hours and minutes
 * Returns null if invalid format
 */
function parseTime(time: string | null): { hours: number; minutes: number } | null {
  if (!time) return null;

  const parts = time.split(":");
  if (parts.length !== 2) return null;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  // Validate ranges
  if (isNaN(hours) || isNaN(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;

  return { hours, minutes };
}

/**
 * Combine date and time into a timestamp (milliseconds since epoch)
 * This allows proper comparison across midnight boundaries
 * Uses UTC to avoid timezone issues
 */
function getTimestamp(date: Date, time: string | null): number {
  const d = new Date(date);
  const parsed = parseTime(time);

  if (parsed) {
    // Use UTC methods to avoid timezone issues
    d.setUTCHours(parsed.hours, parsed.minutes, 0, 0);
  } else {
    // If no valid time, use start of day (midnight)
    d.setUTCHours(0, 0, 0, 0);
  }

  return d.getTime();
}

/**
 * Check if two timestamps are too close (within MIN_HOURS_BETWEEN_TRIPS)
 */
function timestampsTooClose(ts1: number, ts2: number): boolean {
  const diffMs = Math.abs(ts1 - ts2);
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours < MIN_HOURS_BETWEEN_TRIPS;
}

/**
 * Main assignment function
 * @param trips - Unassigned trips to process
 * @param drivers - Available drivers with priority and availability
 * @param existingAssignments - Already assigned trips (to avoid conflicts)
 */
export function assignTripsToDrivers(
  trips: Trip[],
  drivers: Driver[],
  existingAssignments: ExistingAssignment[] = []
): AssignmentResult {
  if (trips.length === 0) {
    return {
      assignments: [],
      warnings: [],
      summary: "No trips to assign",
      distribution: [],
      stats: { totalTrips: 0, assignedCount: 0, unassignedCount: 0 },
    };
  }

  if (drivers.length === 0) {
    return {
      assignments: [],
      warnings: ["No active drivers available"],
      summary: "Assignment failed: No drivers",
      distribution: [],
      stats: { totalTrips: trips.length, assignedCount: 0, unassignedCount: trips.length },
    };
  }

  // Track driver workload for balancing (total trips across all dates)
  // Pre-populate with existing assignment counts
  const driverLoad = new Map<string, number>();

  // Track driver assignments using absolute timestamps
  // Key: driverId -> array of timestamps (ms since epoch)
  // Pre-initialize for all drivers to avoid repeated Map lookups
  const driverTimestamps = new Map<string, number[]>();

  // Initialize all drivers with empty arrays and zero load
  for (const driver of drivers) {
    driverLoad.set(driver.id, 0);
    driverTimestamps.set(driver.id, []);
  }

  // Pre-populate with existing assignments to avoid conflicts
  // Uses push() instead of spread for better performance
  for (const existing of existingAssignments) {
    const timestamps = driverTimestamps.get(existing.driverId);
    if (timestamps) {
      timestamps.push(getTimestamp(existing.tripDate, existing.plannedArrivalTime));
      driverLoad.set(existing.driverId, (driverLoad.get(existing.driverId) || 0) + 1);
    }
  }

  // Build lookup: dayOfWeek -> available drivers sorted by priority, then by name
  // Pre-sorting allows faster selection during assignment
  const driversByDay = new Map<number, Driver[]>();
  for (let day = 0; day < 7; day++) {
    const dayDrivers = drivers
      .filter((d) => d.availability.some((a) => a.dayOfWeek === day))
      .sort((a, b) => {
        // Primary: sort by priority (lower number = higher priority)
        const priorityDiff = (a.priority ?? 2) - (b.priority ?? 2);
        if (priorityDiff !== 0) return priorityDiff;
        // Secondary: sort by name alphabetically
        return a.name.localeCompare(b.name);
      });
    driversByDay.set(day, dayDrivers);
  }

  const assignments: Assignment[] = [];
  const warnings: string[] = [];

  for (const trip of trips) {
    const tripTimestamp = getTimestamp(trip.tripDate, trip.plannedArrivalTime);

    // Get effective day for availability matching
    // Early morning trips (before cutoff) are treated as previous day's shift
    const effectiveDay = getEffectiveDayOfWeek(trip.dayOfWeek, trip.plannedArrivalTime);
    const dayDrivers = driversByDay.get(effectiveDay) || [];

    // Filter out drivers who have a conflicting timestamp (within MIN_HOURS_BETWEEN_TRIPS)
    const availableDrivers = dayDrivers.filter((driver) => {
      const assignedTimestamps = driverTimestamps.get(driver.id) || [];

      // Check if any assigned timestamp conflicts with this trip's timestamp
      const hasConflict = assignedTimestamps.some((assignedTs) =>
        timestampsTooClose(assignedTs, tripTimestamp)
      );

      return !hasConflict;
    });

    if (availableDrivers.length === 0) {
      // Check if it's because no drivers work that day, or all have time conflicts
      if (dayDrivers.length === 0) {
        const effectiveDayName = DAY_NAMES[effectiveDay];
        const isNightShift = effectiveDay !== trip.dayOfWeek;
        const dayInfo = isNightShift
          ? `${effectiveDayName} (night shift into ${DAY_NAMES[trip.dayOfWeek]})`
          : effectiveDayName;
        warnings.push(`Trip ${trip.tripId}: No driver available on ${dayInfo}`);
      } else {
        const timeStr = trip.plannedArrivalTime || "unknown time";
        const dateStr = trip.tripDate.toISOString().split("T")[0];
        warnings.push(
          `Trip ${trip.tripId}: All drivers have conflicting trips near ${timeStr} on ${dateStr}`
        );
      }
      continue;
    }

    // Select driver based on: 1) Priority, 2) Load balancing, 3) Name (alphabetical)
    const selectedDriver = availableDrivers.reduce((bestDriver, driver) => {
      const bestPriority = bestDriver.priority ?? 2;
      const currentPriority = driver.priority ?? 2;
      const bestLoad = driverLoad.get(bestDriver.id) || 0;
      const currentLoad = driverLoad.get(driver.id) || 0;

      // 1. Higher priority (lower number) always wins
      if (currentPriority < bestPriority) {
        return driver;
      }
      if (currentPriority > bestPriority) {
        return bestDriver;
      }

      // 2. Same priority: pick lower workload
      if (currentLoad < bestLoad) {
        return driver;
      }
      if (currentLoad > bestLoad) {
        return bestDriver;
      }

      // 3. Same priority AND workload: pick by name (alphabetical)
      return driver.name.localeCompare(bestDriver.name) < 0 ? driver : bestDriver;
    });

    const priorityLabel =
      selectedDriver.priority === 1
        ? "high"
        : selectedDriver.priority === 3
          ? "low"
          : "med";

    // Build reasoning with night shift info if applicable
    const isNightShift = effectiveDay !== trip.dayOfWeek;
    const dayLabel = isNightShift
      ? `${DAY_NAMES[effectiveDay]} night`
      : DAY_NAMES[trip.dayOfWeek];

    assignments.push({
      tripId: trip.id,
      driverId: selectedDriver.id,
      reasoning: `${dayLabel} - ${selectedDriver.name} (${priorityLabel} priority)`,
    });

    // Track this driver's assignment timestamp (uses push for performance)
    driverTimestamps.get(selectedDriver.id)!.push(tripTimestamp);

    // Update total workload for balancing across different dates
    driverLoad.set(selectedDriver.id, driverLoad.get(selectedDriver.id)! + 1);
  }

  // Build distribution data
  const distribution: DriverDistribution[] = drivers
    .map((d) => ({
      driverId: d.id,
      driverName: d.name,
      tripCount: driverLoad.get(d.id) || 0,
    }))
    .filter((d) => d.tripCount > 0)
    .sort((a, b) => b.tripCount - a.tripCount);

  const unassignedCount = trips.length - assignments.length;

  return {
    assignments,
    warnings,
    summary: `Assigned ${assignments.length} of ${trips.length} trips`,
    distribution,
    stats: {
      totalTrips: trips.length,
      assignedCount: assignments.length,
      unassignedCount,
    },
  };
}
