# Trip Scheduler - Implementation Phases 0-4

This document contains the implementation phases 0 through 4 for the Trip Scheduler application.

> **Note**: This is part of the full implementation guide. See `new-implementation.md` for project overview, tech stack, database schema, design system, and other reference materials.

---

## Implementation Phases

### Phase 0: Project Setup & Database

**Prompt for Claude Code CLI**:

```
Set up the Trip Scheduler project database models and type definitions.

ALREADY CONFIGURED (do not modify):
- Next.js 16 with App Router
- TypeScript strict mode
- Tailwind CSS 4
- src/ directory structure
- lib/prisma.ts - Prisma 7 with @prisma/adapter-pg (default export)
- lib/gemini.ts - Google GenAI with gemini-2.5-flash (exports: genAI, MODEL_NAME)
- context/QueryProvider.tsx - TanStack Query provider (default export)
- Prisma generator and datasource already configured

REQUIREMENTS:

1. Prisma Schema (prisma/schema.prisma):
Add the following models to the existing schema:
  • Driver (id, name, isActive, timestamps)
  • DriverAvailability (id, driverId, dayOfWeek 0-6, isAvailable)
  • WeekUpload (id, fileName, uploadedAt, status enum, totalTrips, assignedTrips)
  • Trip (id, tripId unique, tripDate, dayOfWeek, tripStage, weekUploadId optional)
  • TripAssignment (id, tripId unique, driverId, assignedAt, isAutoAssigned, aiReasoning)
  • ChatMessage (id, sessionId, role, content, createdAt)

2. Environment Variables (.env.local):
```env
DATABASE_URL="postgresql://..."
GEMINI_API_KEY="your-gemini-api-key"
```

3. Base Dependencies:
```bash
pnpm add date-fns papaparse zustand
pnpm add -D @types/papaparse
```
Note: @tanstack/react-query already installed via QueryProvider

4. Initialize Database:
```bash
pnpm prisma generate
pnpm prisma migrate dev --name init
```

5. Type Definitions (lib/types.ts):
- Export TypeScript interfaces matching Prisma models
- Add helper types (DayOfWeek, DAY_NAMES, DAY_NAMES_SHORT)

6. Constants (lib/constants.ts):
- DAY_NAMES array
- DAY_NAMES_SHORT array
- Status colors mapping

7. Query Keys (lib/query-keys.ts):
```typescript
export const queryKeys = {
  drivers: {
    all: ["drivers"] as const,
    list: () => [...queryKeys.drivers.all, "list"] as const,
    detail: (id: string) => [...queryKeys.drivers.all, "detail", id] as const,
  },
  trips: {
    all: ["trips"] as const,
    list: () => [...queryKeys.trips.all, "list"] as const,
    detail: (id: string) => [...queryKeys.trips.all, "detail", id] as const,
  },
  assignments: {
    all: ["assignments"] as const,
    list: () => [...queryKeys.assignments.all, "list"] as const,
    stats: () => [...queryKeys.assignments.all, "stats"] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    stats: () => [...queryKeys.dashboard.all, "stats"] as const,
    pendingTrips: () => [...queryKeys.dashboard.all, "pendingTrips"] as const,
  },
};
```

IMPORTS TO USE:
```typescript
// Prisma (default export)
import prisma from "@/lib/prisma";

// Gemini AI
import { genAI, MODEL_NAME } from "@/lib/gemini";
```

FOLDER STRUCTURE:
```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── actions/
├── components/
│   └── ui/
├── hooks/
├── lib/
│   ├── prisma.ts          # Already configured (Prisma 7 + pg adapter)
│   ├── gemini.ts          # Already configured (gemini-2.5-flash)
│   ├── types.ts
│   ├── constants.ts
│   └── utils.ts
├── context/
│   └── QueryProvider.tsx  # Already configured
└── store/
prisma/
├── schema.prisma
└── migrations/
```
```

---

### Phase 1: Layout & Navigation

**Prompt for Claude Code CLI**:

```
Create the main layout and navigation for Trip Scheduler app.

REQUIREMENTS:

1. Root Layout (app/layout.tsx):
- Wrap with necessary providers (TanStack Query)
- Include Toaster from sonner for notifications
- Set up metadata (title, description)

```typescript
// app/layout.tsx
import { Toaster } from "@/components/ui/sonner";
import QueryProvider from "@/context/QueryProvider"; // Already exists

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {/* Main layout with sidebar */}
          {children}
          <Toaster position="top-right" richColors closeButton />
        </QueryProvider>
      </body>
    </html>
  );
}
```

2. Dashboard Layout with Sidebar:
- Create components/layout/sidebar.tsx
- Logo: "Trip Scheduler" with Truck icon
- Navigation links with icons:
  • Dashboard (/) - LayoutDashboard
  • Trips (/trips) - Package
  • Drivers (/drivers) - Users
  • Assignments (/assignments) - ClipboardCheck
  • Calendar (/calendar) - CalendarDays
  • Chat (/chat) - MessageSquare
- Active state: bg-muted rounded-lg
- Hover state: bg-muted/50
- Sidebar width: w-64
- Collapsible on tablet (md breakpoint)

3. Header (components/layout/header.tsx):
- Mobile menu trigger (Sheet)
- Page title (dynamic)
- Optional: breadcrumbs

4. Mobile Navigation (components/layout/mobile-nav.tsx):
- Fixed bottom bar on mobile
- 5 icon buttons (Home, Trips, Drivers, Assign, Calendar)
- Active indicator

DESIGN SPECS:
- Sidebar background: bg-background border-r
- Active link: bg-muted text-foreground
- Inactive link: text-muted-foreground hover:text-foreground
- Spacing: p-4 for sidebar, gap-2 for nav items
- Icon size: h-5 w-5
- Font: text-sm font-medium

SHADCN COMPONENTS NEEDED:
- Button
- Sheet (for mobile nav)
- ScrollArea (for sidebar)
- Separator
- Sonner (already installed - for Toaster)

TOAST USAGE (throughout app):
```typescript
import { toast } from "sonner";

// Success
toast.success("Driver added successfully");

// Error
toast.error("Failed to add driver");

// Warning
toast.warning("Some trips could not be assigned");

// Info
toast.info("Processing...");

// With description
toast.success("Driver added", {
  description: "John Smith has been added to the team"
});

// Promise (for async operations)
toast.promise(saveDriver(), {
  loading: "Saving driver...",
  success: "Driver saved!",
  error: "Failed to save driver"
});
```

Create placeholder pages for all routes that just show the page title.
```

---

### Phase 2: Dashboard Page

**Prompt for Claude Code CLI**:

```
Create the Dashboard page (app/page.tsx) for Trip Scheduler using Server Actions.

REQUIREMENTS:

1. Page Header:
- Title: "Dashboard"
- Subtitle: "Overview of your trip scheduling system"

2. Stats Cards Grid (components/dashboard/stats-grid.tsx):
- 4 cards in responsive grid (1 col mobile, 2 col sm, 4 col lg)
- Each card shows:
  • Icon (in muted circle)
  • Label (text-sm text-muted-foreground)
  • Value (text-2xl font-semibold)
  • Optional trend indicator
- Cards:
  • Total Drivers (Users icon) - blue
  • Trips This Week (Package icon) - green
  • Assigned (ClipboardCheck icon) - emerald
  • Pending (Clock icon) - amber

3. Quick Actions Card (components/dashboard/quick-actions.tsx):
- Title: "Quick Actions"
- Buttons in grid (2 cols):
  • Add Driver → /drivers (with dialog trigger)
  • Add Trip → /trips
  • Import CSV → /trips?tab=csv
  • Auto-Assign → /assignments

4. Pending Trips Table (components/dashboard/pending-trips.tsx):
- Title: "Pending Assignments" with "View All" link
- Show only unassigned trips (max 5)
- Columns: Trip ID, Date, Day, Status, Action
- Action: "Assign" button
- Empty state if no pending trips

DESIGN SPECS:
- Page padding: p-4 md:p-6 lg:p-8
- Section gap: gap-6 lg:gap-8
- Card padding: p-6
- Stats card: border rounded-lg
- Fetch data using server actions

SHADCN COMPONENTS:
- Card, CardHeader, CardTitle, CardContent
- Button
- Table, TableHeader, TableBody, TableRow, TableCell
- Badge
- Skeleton (for loading)

SERVER ACTIONS (actions/dashboard-actions.ts):
```typescript
"use server"

import prisma from "@/lib/prisma";
import { startOfWeek, endOfWeek } from "date-fns";

type ActionResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

interface DashboardStats {
  totalDrivers: number;
  tripsThisWeek: number;
  assignedTrips: number;
  pendingTrips: number;
}

export async function getDashboardStats(): Promise<ActionResponse<DashboardStats>> {
  try {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    const [totalDrivers, tripsThisWeek, assignedTrips, pendingTrips] = await Promise.all([
      prisma.driver.count({ where: { isActive: true } }),
      prisma.trip.count({
        where: {
          tripDate: { gte: weekStart, lte: weekEnd },
          tripStage: "Upcoming"
        }
      }),
      prisma.trip.count({
        where: {
          tripDate: { gte: weekStart, lte: weekEnd },
          tripStage: "Upcoming",
          assignment: { isNot: null }
        }
      }),
      prisma.trip.count({
        where: {
          tripDate: { gte: weekStart, lte: weekEnd },
          tripStage: "Upcoming",
          assignment: null
        }
      })
    ]);

    return { success: true, data: { totalDrivers, tripsThisWeek, assignedTrips, pendingTrips } };
  } catch (error) {
    return { success: false, error: "Failed to fetch dashboard stats" };
  }
}

export async function getPendingTrips(limit = 5): Promise<ActionResponse<any[]>> {
  try {
    const trips = await prisma.trip.findMany({
      where: {
        tripStage: "Upcoming",
        assignment: null
      },
      orderBy: { tripDate: "asc" },
      take: limit
    });
    return { success: true, data: trips };
  } catch (error) {
    return { success: false, error: "Failed to fetch pending trips" };
  }
}
```

HOOKS (hooks/use-dashboard.ts):
```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getDashboardStats, getPendingTrips } from "@/actions/dashboard-actions";

// Query: Dashboard stats
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      const result = await getDashboardStats();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

// Query: Pending trips for dashboard
export function usePendingTrips(limit = 5) {
  return useQuery({
    queryKey: [...queryKeys.dashboard.pendingTrips(), limit],
    queryFn: async () => {
      const result = await getPendingTrips(limit);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}
```

PAGE COMPONENT (app/page.tsx):
```typescript
import { getDashboardStats, getPendingTrips } from "@/actions/dashboard-actions";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { PendingTrips } from "@/components/dashboard/pending-trips";

export default async function DashboardPage() {
  const [stats, pendingTrips] = await Promise.all([
    getDashboardStats(),
    getPendingTrips(5)
  ]);

  return (
    <div className="flex flex-col gap-8 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of your trip scheduling system
        </p>
      </div>

      <StatsGrid stats={stats} />

      <div className="grid gap-6 md:grid-cols-2">
        <QuickActions />
        <PendingTrips trips={pendingTrips} />
      </div>
    </div>
  );
}
```
```

---

### Phase 3: Drivers Page

**Prompt for Claude Code CLI**:

```
Create the Drivers management page (app/drivers/page.tsx) for Trip Scheduler using Server Actions.

REQUIREMENTS:

1. Page Header:
- Title: "Drivers"
- Subtitle: "Manage your drivers and their availability"
- "Add Driver" button (opens dialog)

2. Search & Filter Bar:
- Search input with icon
- Optional: Filter by availability

3. Driver Table (components/drivers/driver-table.tsx):
- Columns:
  • Name (sortable)
  • Availability (7 day indicators)
  • Actions (Edit, Delete)
- Responsive: Table on desktop, Cards on mobile
- Empty state with illustration

4. Availability Display:
- 7 circles/badges for Sun-Sat
- Filled (bg-primary) = available
- Outline (bg-muted) = unavailable
- Show day abbreviation below

5. Add/Edit Dialog (components/drivers/driver-dialog.tsx):
- Title: "Add Driver" or "Edit Driver"
- Form fields:
  • Name input (required)
  • Availability picker (7 toggles)
- Validation:
  • Name required, min 2 chars
  • At least 1 day selected
- Actions: Cancel, Save

6. Availability Picker (components/drivers/availability-picker.tsx):
- 7 toggle buttons in a row
- Each shows day abbreviation
- Toggle on/off with visual feedback
- Accessible labels

7. Delete Confirmation:
- AlertDialog
- "Are you sure you want to delete {name}?"
- Cancel and Delete buttons

DESIGN SPECS:
- Table row hover: hover:bg-muted/50
- Day indicator size: h-8 w-8 rounded-full
- Dialog max-width: sm:max-w-md
- Form spacing: space-y-4

SHADCN COMPONENTS:
- Table, Dialog, AlertDialog
- Input, Button, Form
- Toggle or custom checkbox buttons
- Toast (sonner) for success/error

SERVER ACTIONS (actions/driver-actions.ts):
```typescript
"use server"

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Standard response type for all actions
type ActionResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

const driverSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  availability: z.array(z.number()).min(1, "Select at least one day")
});

export async function getDrivers(): Promise<ActionResponse<Awaited<ReturnType<typeof prisma.driver.findMany>>>> {
  try {
    const drivers = await prisma.driver.findMany({
      where: { isActive: true },
      include: { availability: true },
      orderBy: { name: "asc" }
    });
    return { success: true, data: drivers };
  } catch (error) {
    return { success: false, error: "Failed to fetch drivers" };
  }
}

export async function createDriver(formData: FormData): Promise<ActionResponse<any>> {
  try {
    const name = formData.get("name") as string;
    const availability = JSON.parse(formData.get("availability") as string);

    const validated = driverSchema.safeParse({ name, availability });
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0].message };
    }

    const driver = await prisma.driver.create({
      data: {
        name: validated.data.name,
        availability: {
          create: validated.data.availability.map(day => ({
            dayOfWeek: day,
            isAvailable: true
          }))
        }
      },
      include: { availability: true }
    });

    revalidatePath("/drivers");
    revalidatePath("/");
    return { success: true, data: driver };
  } catch (error) {
    return { success: false, error: "Failed to create driver" };
  }
}

export async function updateDriver(id: string, formData: FormData): Promise<ActionResponse<any>> {
  try {
    const name = formData.get("name") as string;
    const availability = JSON.parse(formData.get("availability") as string);

    const validated = driverSchema.safeParse({ name, availability });
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0].message };
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
            isAvailable: true
          }))
        }
      },
      include: { availability: true }
    });

    revalidatePath("/drivers");
    revalidatePath("/assignments");
    return { success: true, data: driver };
  } catch (error) {
    return { success: false, error: "Failed to update driver" };
  }
}

export async function deleteDriver(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    await prisma.driver.update({
      where: { id },
      data: { isActive: false }
    });

    revalidatePath("/drivers");
    revalidatePath("/");
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: "Failed to delete driver" };
  }
}
```

HOOKS (hooks/use-drivers.ts):
```typescript
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import {
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
} from "@/actions/driver-actions";

// Query: List all drivers
export function useDrivers() {
  return useQuery({
    queryKey: queryKeys.drivers.list(),
    queryFn: async () => {
      const result = await getDrivers();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

// Mutation: Create driver
export function useCreateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; availability: number[] }) => {
      const formData = new FormData();
      formData.append("name", input.name);
      formData.append("availability", JSON.stringify(input.availability));
      const result = await createDriver(formData);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success("Driver created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create driver");
    },
  });
}

// Mutation: Update driver
export function useUpdateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: { name: string; availability: number[] } }) => {
      const formData = new FormData();
      formData.append("name", input.name);
      formData.append("availability", JSON.stringify(input.availability));
      const result = await updateDriver(id, formData);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      toast.success("Driver updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update driver");
    },
  });
}

// Mutation: Delete driver
export function useDeleteDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteDriver(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success("Driver deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete driver");
    },
  });
}
```
```

---

### Phase 4: Trips Page

**Prompt for Claude Code CLI**:

```
Create the Trips page (app/trips/page.tsx) for Trip Scheduler using Server Actions.

REQUIREMENTS:

1. Page Header:
- Title: "Trips"
- Subtitle: "Manage trips and import from CSV"
- "Add Trip" button

2. Tab Navigation:
- Tab 1: "Manual Entry"
- Tab 2: "Import CSV"
- Clean tab styling

3. Manual Entry Tab:
- Trip Form (components/trips/trip-form.tsx):
  • Trip ID input (required, format: T-XXXXXXXX)
  • Date picker (required)
  • Submit button: "Add Trip"
- Validation with zod:
  • tripId: required, starts with "T-"
  • date: required, valid date

4. Import CSV Tab:
- CSV Import Zone (components/trips/csv-import.tsx):
  • Drag & drop area with dashed border
  • "Drop CSV here or click to browse"
  • File input (hidden, triggered by click)
  • Accept only .csv files

5. CSV Processing:
- Parse CSV using papaparse
- Extract columns:
  • "Trip ID" → tripId
  • "Stop 1 Planned Arrival Date" → tripDate
  • "Trip Stage" → filter out "Canceled"
- Group by Trip ID (duplicates = 1 trip)
- Calculate dayOfWeek from date

6. CSV Preview (components/trips/csv-preview.tsx):
- Show parsed trips in table
- Columns: Trip ID, Date, Day, Status
- "Import X Trips" button
- "Cancel" button

7. Trips Table (components/trips/trip-table.tsx):
- All trips list
- Columns: Trip ID, Date, Day, Status, Driver
- Status badge:
  • Pending (amber)
  • Assigned (green)
- Filter by status
- Delete action

DESIGN SPECS:
- Dropzone: border-2 border-dashed rounded-lg p-8
- Dropzone hover: border-primary bg-muted/50
- Tab content padding: pt-6
- Form max-width: max-w-md

SHADCN COMPONENTS:
- Tabs, TabsList, TabsTrigger, TabsContent
- Input, Button, Form
- Calendar (date picker)
- Table
- Badge
- Toast

LIBRARIES:
- papaparse for CSV parsing
- date-fns for date handling

SERVER ACTIONS (actions/trip-actions.ts):
```typescript
"use server"

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type ActionResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

const tripSchema = z.object({
  tripId: z.string().startsWith("T-", "Trip ID must start with T-"),
  tripDate: z.coerce.date()
});

export async function getTrips(): Promise<ActionResponse<any[]>> {
  try {
    const trips = await prisma.trip.findMany({
      include: { assignment: { include: { driver: true } } },
      orderBy: { tripDate: "asc" }
    });
    return { success: true, data: trips };
  } catch (error) {
    return { success: false, error: "Failed to fetch trips" };
  }
}

export async function createTrip(formData: FormData): Promise<ActionResponse<any>> {
  try {
    const tripId = formData.get("tripId") as string;
    const tripDate = new Date(formData.get("tripDate") as string);

    const validated = tripSchema.safeParse({ tripId, tripDate });
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0].message };
    }

    const dayOfWeek = validated.data.tripDate.getDay();

    // Check if trip already exists
    const existing = await prisma.trip.findFirst({
      where: { tripId: validated.data.tripId }
    });

    if (existing) {
      return { success: false, error: "Trip ID already exists" };
    }

    const trip = await prisma.trip.create({
      data: {
        tripId: validated.data.tripId,
        tripDate: validated.data.tripDate,
        dayOfWeek,
        tripStage: "Upcoming"
      }
    });

    revalidatePath("/trips");
    revalidatePath("/");
    return { success: true, data: trip };
  } catch (error) {
    return { success: false, error: "Failed to create trip" };
  }
}

export async function importTripsFromCSV(trips: {
  tripId: string;
  tripDate: Date;
  dayOfWeek: number;
}[]): Promise<ActionResponse<{ imported: number; skipped: number }>> {
  try {
    let imported = 0;
    let skipped = 0;

    for (const trip of trips) {
      const existing = await prisma.trip.findFirst({
        where: { tripId: trip.tripId }
      });

      if (!existing) {
        await prisma.trip.create({
          data: {
            tripId: trip.tripId,
            tripDate: trip.tripDate,
            dayOfWeek: trip.dayOfWeek,
            tripStage: "Upcoming"
          }
        });
        imported++;
      } else {
        skipped++;
      }
    }

    revalidatePath("/trips");
    revalidatePath("/");
    return { success: true, data: { imported, skipped } };
  } catch (error) {
    return { success: false, error: "Failed to import trips" };
  }
}

export async function deleteTrip(id: string): Promise<ActionResponse<{ id: string }>> {
  try {
    await prisma.trip.delete({ where: { id } });
    revalidatePath("/trips");
    revalidatePath("/");
    return { success: true, data: { id } };
  } catch (error) {
    return { success: false, error: "Failed to delete trip" };
  }
}
```

HOOKS (hooks/use-trips.ts):
```typescript
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import {
  getTrips,
  createTrip,
  importTripsFromCSV,
  deleteTrip,
} from "@/actions/trip-actions";

// Query: List all trips
export function useTrips() {
  return useQuery({
    queryKey: queryKeys.trips.list(),
    queryFn: async () => {
      const result = await getTrips();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

// Mutation: Create trip
export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { tripId: string; tripDate: string }) => {
      const formData = new FormData();
      formData.append("tripId", input.tripId);
      formData.append("tripDate", input.tripDate);
      const result = await createTrip(formData);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      toast.success("Trip created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create trip");
    },
  });
}

// Mutation: Import trips from CSV
export function useImportTrips() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trips: { tripId: string; tripDate: Date; dayOfWeek: number }[]) => {
      const result = await importTripsFromCSV(trips);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      toast.success(`Imported ${data.imported} trips${data.skipped > 0 ? `, ${data.skipped} skipped` : ""}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to import trips");
    },
  });
}

// Mutation: Delete trip
export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteTrip(id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      toast.success("Trip deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete trip");
    },
  });
}
```

CSV PARSING (lib/csv-parser.ts):
```typescript
import Papa from "papaparse";
import { getDay, parse, isValid } from "date-fns";

interface CSVRow {
  "Trip ID": string;
  "Stop 1 Planned Arrival Date": string;
  "Trip Stage": string;
}

interface ParsedTrip {
  tripId: string;
  tripDate: Date;
  dayOfWeek: number;
}

// Supported date formats for flexible CSV parsing
const DATE_FORMATS = [
  "M/d/yy",       // 1/15/26
  "MM/dd/yy",     // 01/15/26
  "M/d/yyyy",     // 1/15/2026
  "MM/dd/yyyy",   // 01/15/2026
  "yyyy-MM-dd",   // 2026-01-15 (ISO)
  "dd/MM/yyyy",   // 15/01/2026 (European)
  "dd-MM-yyyy",   // 15-01-2026
  "MMM d, yyyy",  // Jan 15, 2026
  "MMMM d, yyyy", // January 15, 2026
] as const;

/**
 * Parses a date string trying multiple formats
 * Returns null if no format matches
 */
function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;

  const trimmed = dateStr.trim();

  // Try each format until one works
  for (const format of DATE_FORMATS) {
    try {
      const parsed = parse(trimmed, format, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      // Continue to next format
    }
  }

  // Fallback: try native Date parsing for ISO strings
  const nativeDate = new Date(trimmed);
  if (isValid(nativeDate)) {
    return nativeDate;
  }

  return null;
}

export function parseTripsCSV(file: File): Promise<ParsedTrip[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const trips = new Map<string, ParsedTrip>();
        const errors: string[] = [];

        for (const row of results.data) {
          // Skip canceled trips
          if (row["Trip Stage"] === "Canceled") continue;

          const tripId = row["Trip ID"];
          if (!tripId || trips.has(tripId)) continue;

          const dateStr = row["Stop 1 Planned Arrival Date"];
          const tripDate = parseFlexibleDate(dateStr);

          if (!tripDate) {
            errors.push(`Invalid date format for trip ${tripId}: "${dateStr}"`);
            continue;
          }

          trips.set(tripId, {
            tripId,
            tripDate,
            dayOfWeek: getDay(tripDate)
          });
        }

        if (errors.length > 0) {
          console.warn("CSV parsing warnings:", errors);
        }

        resolve(Array.from(trips.values()));
      },
      error: (error) => reject(error)
    });
  });
}
```
```
