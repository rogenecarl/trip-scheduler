// ============================================
// DATABASE TYPES (matching Prisma schema)
// ============================================

export interface Driver {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  availability: DriverAvailability[];
  assignments?: TripAssignment[];
}

export interface DriverAvailability {
  id: string;
  driverId: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  isAvailable: boolean;
}

export interface WeekUpload {
  id: string;
  fileName: string;
  uploadedAt: Date;
  status: UploadStatus;
  totalTrips: number;
  assignedTrips: number;
  trips?: Trip[];
}

export type UploadStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface Trip {
  id: string;
  tripId: string; // e.g., "T-115JCVWMY"
  tripDate: Date;
  dayOfWeek: number; // 0-6
  tripStage: string; // "Upcoming" | "Canceled"
  plannedArrivalTime?: string | null; // 24h format (e.g., "23:58", "7:35")
  weekUploadId?: string | null;
  createdAt: Date;
  weekUpload?: WeekUpload | null;
  assignment?: TripAssignment | null;
}

export interface TripAssignment {
  id: string;
  tripId: string;
  driverId: string;
  assignedAt: Date;
  isAutoAssigned: boolean; // true = AI assigned, false = manual
  aiReasoning?: string | null;
  trip?: Trip;
  driver?: Driver;
}

// ============================================
// SERVER ACTION RESPONSE TYPE
// ============================================

export type ActionResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

// ============================================
// HELPER TYPES
// ============================================

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_NAMES_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

// ============================================
// UI TYPES
// ============================================

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface DashboardStats {
  totalDrivers: number;
  totalTrips: number;
  assignedTrips: number;
  pendingTrips: number;
}

// ============================================
// ASSIGNMENT TYPES
// ============================================

export interface AssignmentStats {
  total: number;
  assigned: number;
  pending: number;
}

// ============================================
// ASSIGNMENT TYPES (Fast Algorithm)
// ============================================

/** Assignment result from the fast algorithm */
export interface AIAssignment {
  tripId: string;
  driverId: string;
  reasoning: string;
}

/** Driver workload distribution */
export interface DriverDistribution {
  driverId: string;
  driverName: string;
  tripCount: number;
}

/** Assignment statistics */
export interface AssignmentResultStats {
  totalTrips: number;
  assignedCount: number;
  unassignedCount: number;
}

/** Result from autoAssignDrivers() */
export interface AIAssignmentResult {
  success: boolean;
  assignments?: AIAssignment[];
  summary?: string;
  warnings?: string[];
  error?: string;
  distribution?: DriverDistribution[];
  stats?: AssignmentResultStats;
  durationMs?: number;
}

// ============================================
// CSV TYPES
// ============================================

export interface ParsedTrip {
  tripId: string;
  tripDate: Date;
  dayOfWeek: number;
  tripStage: string; // "Upcoming" | "Canceled"
  plannedArrivalTime: string | null; // 24h format (e.g., "23:58", "7:35")
}

export interface CSVImportResult {
  imported: number;
  skipped: number;
}

export interface CSVImportResultEnhanced extends CSVImportResult {
  duplicateTripIds: string[];
}

// ============================================
// PAGINATION TYPES
// ============================================

export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export type DriverPaginationParams = PaginationParams;

export interface TripPaginationParams extends PaginationParams {
  status?: "all" | "pending" | "assigned";
}

export interface AssignmentPaginationParams extends PaginationParams {
  status?: "all" | "pending" | "assigned";
}

// ============================================
// CALENDAR TYPES
// ============================================

export interface CalendarDayData {
  date: Date;
  availableDrivers: {
    id: string;
    name: string;
  }[];
  trips: {
    id: string;
    tripId: string;
    tripDate: Date;
    driverName: string | null;
    isAssigned: boolean;
  }[];
}

export interface CalendarMonthData {
  year: number;
  month: number;
  days: CalendarDayData[];
}
