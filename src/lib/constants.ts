import {
  LayoutDashboard,
  Package,
  Users,
  ClipboardCheck,
  CalendarDays,
  MessageSquare,
} from "lucide-react";
import type { NavItem } from "./types";

// ============================================
// DAY OF WEEK (Numeric: 0 = Sunday, 6 = Saturday)
// ============================================

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
// NAVIGATION
// ============================================

export const LANDING_NAV_ITEMS: NavItem[] = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
];

export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Trips", href: "/dashboard/trips", icon: Package },
  { label: "Drivers", href: "/dashboard/drivers", icon: Users },
  { label: "Assignments", href: "/dashboard/assignments", icon: ClipboardCheck },
  { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { label: "Chat", href: "/dashboard/chat", icon: MessageSquare },
];

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Trips", href: "/dashboard/trips", icon: Package },
  { label: "Drivers", href: "/dashboard/drivers", icon: Users },
  { label: "Assign", href: "/dashboard/assignments", icon: ClipboardCheck },
  { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
];

// ============================================
// STATUS COLORS
// ============================================

export const STATUS_COLORS = {
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  assigned: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  canceled: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  active: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
} as const;

export const UPLOAD_STATUS_COLORS = {
  PENDING: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  PROCESSING: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  COMPLETED: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  FAILED: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
} as const;

// ============================================
// APP CONSTANTS
// ============================================

export const APP_NAME = "Trip Scheduler";
export const APP_DESCRIPTION = "Automated driver assignment for Peak Transport";

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Date formats
export const DATE_FORMAT = "MMM d, yyyy"; // Jan 15, 2026
export const DATE_FORMAT_SHORT = "MM/dd/yy"; // 01/15/26
export const DATE_FORMAT_ISO = "yyyy-MM-dd"; // 2026-01-15
