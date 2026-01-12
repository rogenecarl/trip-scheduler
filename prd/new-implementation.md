# Trip Scheduler - Implementation Guide

## Project Overview

**Trip Scheduler** is a web application for Peak Transport that automates driver assignment to trips using AI (Gemini). Users can manage drivers, import trips via CSV or manual entry, and let AI automatically assign available drivers based on their schedules.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Package Manager | pnpm |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui (new-york style) |
| Icons | Lucide React |
| Forms | react-hook-form + zod |
| State Management | Zustand + TanStack Query |
| Date Handling | date-fns |
| CSV Parsing | papaparse |
| AI | Google Gemini (gemini-2.5-flash) |
| Database | PostgreSQL + Prisma |
| Data Fetching | Server Actions |

---

## Database Schema (Prisma 7)

> **Note**: Using Prisma 7 with `@prisma/adapter-pg` for PostgreSQL connection pooling.
> Generated client location: `src/lib/generated/prisma` (already configured)

```prisma
// prisma/schema.prisma
// Trip Scheduler - Peak Transport
// NOTE: generator and datasource already configured - just add models

generator client {
  provider = "prisma-client"
  output   = "../src/lib/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// ENUMS
// ============================================

enum UploadStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

// ============================================
// DRIVER MANAGEMENT
// ============================================

model Driver {
  id           String    @id @default(cuid())
  name         String
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // Relations
  availability DriverAvailability[]
  assignments  TripAssignment[]

  @@index([name])
  @@index([isActive])
}

model DriverAvailability {
  id          String   @id @default(cuid())
  driverId    String
  dayOfWeek   Int      // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  isAvailable Boolean  @default(true)

  // Relations
  driver      Driver   @relation(fields: [driverId], references: [id], onDelete: Cascade)

  @@unique([driverId, dayOfWeek])
  @@index([dayOfWeek])
  @@index([isAvailable])
}

// ============================================
// TRIP MANAGEMENT
// ============================================

model WeekUpload {
  id            String       @id @default(cuid())
  fileName      String
  uploadedAt    DateTime     @default(now())
  status        UploadStatus @default(PENDING)
  totalTrips    Int          @default(0)
  assignedTrips Int          @default(0)

  // Relations
  trips         Trip[]

  @@index([uploadedAt])
  @@index([status])
}

model Trip {
  id            String    @id @default(cuid())

  // Core fields
  tripId        String    @unique  // e.g., "T-115JCVWMY" - UNIQUE (same Trip ID = 1 driver)
  tripDate      DateTime  // From "Stop 1 Planned Arrival Date"
  dayOfWeek     Int       // 0-6, derived from tripDate
  tripStage     String    @default("Upcoming") // "Upcoming" or "Canceled"

  // Optional: Link to CSV upload (null if manually added)
  weekUploadId  String?
  createdAt     DateTime  @default(now())

  // Relations
  weekUpload    WeekUpload?    @relation(fields: [weekUploadId], references: [id], onDelete: Cascade)
  assignment    TripAssignment?

  @@index([tripDate])
  @@index([dayOfWeek])
  @@index([tripStage])
}

model TripAssignment {
  id             String   @id @default(cuid())
  tripId         String   @unique
  driverId       String
  assignedAt     DateTime @default(now())
  isAutoAssigned Boolean  @default(false) // true if assigned by AI, false if manual
  aiReasoning    String?  @db.Text

  // Relations
  trip           Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  driver         Driver   @relation(fields: [driverId], references: [id])

  @@index([driverId])
}

// ============================================
// AI CHAT HISTORY
// ============================================

model ChatMessage {
  id          String   @id @default(cuid())
  sessionId   String
  role        String   // "user" or "assistant"
  content     String   @db.Text
  createdAt   DateTime @default(now())

  @@index([sessionId])
}
```

### Schema Summary

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Driver** | Driver info | `name`, `isActive` |
| **DriverAvailability** | Days driver works | `dayOfWeek` (0-6), `isAvailable` |
| **WeekUpload** | Track CSV imports | `fileName`, `status`, `totalTrips` |
| **Trip** | Trip to assign | `tripId` (unique), `tripDate`, `dayOfWeek` |
| **TripAssignment** | Driver ↔ Trip link | `driverId`, `tripId`, `aiReasoning` |
| **ChatMessage** | AI chat history | `role`, `content`, `sessionId` |

### Day of Week Reference

| Value | Day |
|-------|-----|
| 0 | Sunday |
| 1 | Monday |
| 2 | Tuesday |
| 3 | Wednesday |
| 4 | Thursday |
| 5 | Friday |
| 6 | Saturday |

### Key Design Decisions (Based on Client Requirements)

1. **No time fields** - Only dates matter for trips and availability
2. **Trip ID is unique** - Same Trip ID = same driver (grouped as 1 trip)
3. **Day-based availability** - Drivers available on specific days (not hours)
4. **Soft delete for drivers** - `isActive` flag instead of hard delete

---

## Design System

### Design Principles

1. **Consistency**: Same patterns, spacing, and components across all pages
2. **Clarity**: Clear visual hierarchy, obvious actions, readable text
3. **Efficiency**: Minimize clicks, show relevant info upfront
4. **Feedback**: Loading states, success/error messages, hover effects
5. **Accessibility**: Keyboard navigation, ARIA labels, sufficient contrast
6. **Responsiveness**: Mobile-first, works on all screen sizes

---

### Color Palette

```css
/* Primary Colors */
--background: #ffffff          /* White - main background */
--foreground: #0a0a0a          /* Near black - primary text */

/* Neutral Colors */
--muted: #f5f5f5               /* Light gray - secondary backgrounds */
--muted-foreground: #737373    /* Medium gray - secondary text */
--border: #e5e5e5              /* Light gray - borders */

/* Accent Colors */
--primary: #171717             /* Dark - primary buttons */
--primary-foreground: #fafafa  /* White - text on primary */

/* Semantic Colors */
--success: #22c55e             /* Green - success states */
--warning: #f59e0b             /* Amber - warning states */
--destructive: #ef4444         /* Red - error/delete states */
--info: #3b82f6                /* Blue - info states */

/* Status Badge Colors */
--status-pending: #fef3c7      /* Amber bg */
--status-pending-text: #92400e /* Amber text */
--status-assigned: #dcfce7     /* Green bg */
--status-assigned-text: #166534 /* Green text */
--status-canceled: #fee2e2     /* Red bg */
--status-canceled-text: #991b1b /* Red text */
```

---

### Typography

```css
/* Font Family */
font-family: 'Geist Sans', system-ui, sans-serif;
font-family-mono: 'Geist Mono', monospace; /* For Trip IDs */

/* Font Sizes */
--text-xs: 0.75rem;     /* 12px - labels, captions */
--text-sm: 0.875rem;    /* 14px - secondary text, table cells */
--text-base: 1rem;      /* 16px - body text */
--text-lg: 1.125rem;    /* 18px - lead text */
--text-xl: 1.25rem;     /* 20px - card titles */
--text-2xl: 1.5rem;     /* 24px - section titles */
--text-3xl: 1.875rem;   /* 30px - page titles */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

---

### Spacing System

```css
/* Base unit: 4px */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */

/* Common Patterns */
Page padding: p-4 md:p-6 lg:p-8
Card padding: p-6
Card gap: gap-6
Section gap: gap-8
Form field gap: gap-4
Button padding: px-4 py-2
Table cell padding: px-4 py-3
```

---

### Border Radius

```css
--radius-sm: 0.25rem;   /* 4px - small elements */
--radius-md: 0.375rem;  /* 6px - buttons, inputs */
--radius-lg: 0.5rem;    /* 8px - cards */
--radius-xl: 0.75rem;   /* 12px - dialogs */
--radius-full: 9999px;  /* Pills, avatars */
```

---

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
```

---

### Component Patterns

#### Page Layout Pattern
```tsx
// Every page follows this structure
<div className="flex flex-col gap-8 p-4 md:p-6 lg:p-8">
  {/* Page Header */}
  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        Page Title
      </h1>
      <p className="text-muted-foreground">
        Brief description of the page
      </p>
    </div>
    <div className="flex gap-3">
      {/* Action buttons */}
    </div>
  </div>

  {/* Page Content */}
  <div className="grid gap-6">
    {/* Content sections */}
  </div>
</div>
```

#### Card Pattern
```tsx
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-lg font-medium">Card Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Card content */}
  </CardContent>
  <CardFooter className="border-t pt-4">
    {/* Optional footer actions */}
  </CardFooter>
</Card>
```

#### Table Pattern
```tsx
<div className="rounded-lg border">
  <Table>
    <TableHeader>
      <TableRow className="bg-muted/50">
        <TableHead className="font-medium">Column</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="hover:bg-muted/50">
        <TableCell>Content</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

#### Form Pattern
```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <FormField
      control={form.control}
      name="fieldName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Label</FormLabel>
          <FormControl>
            <Input placeholder="Placeholder" {...field} />
          </FormControl>
          <FormDescription>Helper text</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit">Submit</Button>
  </form>
</Form>
```

#### Dialog Pattern
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Description text</DialogDescription>
    </DialogHeader>
    <div className="py-4">
      {/* Dialog content */}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleAction}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Empty State Pattern
```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="rounded-full bg-muted p-4 mb-4">
    <IconName className="h-8 w-8 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-medium mb-1">No items yet</h3>
  <p className="text-muted-foreground mb-4 max-w-sm">
    Description of what to do next
  </p>
  <Button>
    <Plus className="mr-2 h-4 w-4" />
    Add Item
  </Button>
</div>
```

#### Loading State Pattern
```tsx
// Skeleton for cards
<Card>
  <CardHeader>
    <Skeleton className="h-5 w-32" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-8 w-24" />
  </CardContent>
</Card>

// Skeleton for table rows
<TableRow>
  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
</TableRow>

// Full page loading
<div className="flex items-center justify-center h-64">
  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
</div>
```

#### Status Badge Pattern
```tsx
// Consistent badge variants
<Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
  Pending
</Badge>

<Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
  Assigned
</Badge>

<Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
  Canceled
</Badge>

<Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
  Active
</Badge>
```

#### Day Badge Pattern (for availability)
```tsx
// Available day
<span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-medium">
  Mon
</span>

// Unavailable day
<span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground text-xs font-medium">
  Tue
</span>
```

---

### Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Default | < 640px | Mobile: single column, bottom nav |
| sm | ≥ 640px | Small tablet: 2 columns |
| md | ≥ 768px | Tablet: sidebar visible |
| lg | ≥ 1024px | Desktop: full layout |
| xl | ≥ 1280px | Large desktop: max-width container |

---

## Folder Structure

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx                    # Root layout with sidebar
│   ├── page.tsx                      # Dashboard
│   ├── drivers/
│   │   └── page.tsx                  # Manage drivers
│   ├── trips/
│   │   └── page.tsx                  # View/add trips
│   ├── assignments/
│   │   └── page.tsx                  # AI assignments
│   ├── calendar/
│   │   └── page.tsx                  # Availability calendar
│   └── chat/
│       └── page.tsx                  # AI chat (optional)
│
├── actions/
│   ├── dashboard-actions.ts          # Dashboard stats server actions
│   ├── driver-actions.ts             # Driver CRUD server actions
│   ├── trip-actions.ts               # Trip CRUD server actions
│   ├── assignment-actions.ts         # Assignment server actions
│   ├── ai-actions.ts                 # Gemini AI server actions
│   └── chat-actions.ts               # Chat server actions
│
├── components/
│   ├── ui/                           # shadcn/ui components
│   │
│   ├── layout/
│   │   ├── sidebar.tsx               # Desktop sidebar
│   │   ├── header.tsx                # Page header
│   │   ├── mobile-nav.tsx            # Mobile bottom navigation
│   │   └── nav-link.tsx              # Navigation link component
│   │
│   ├── dashboard/
│   │   ├── stats-card.tsx            # Single stat card
│   │   ├── stats-grid.tsx            # Grid of stat cards
│   │   ├── quick-actions.tsx         # Quick action buttons
│   │   └── recent-trips.tsx          # Recent trips table
│   │
│   ├── drivers/
│   │   ├── driver-table.tsx          # Drivers data table
│   │   ├── driver-form.tsx           # Add/edit driver form
│   │   ├── driver-dialog.tsx         # Dialog wrapper for form
│   │   ├── availability-picker.tsx   # Day selection component
│   │   └── delete-driver-dialog.tsx  # Delete confirmation
│   │
│   ├── trips/
│   │   ├── trip-table.tsx            # Trips data table
│   │   ├── trip-form.tsx             # Manual trip entry form
│   │   ├── trip-dialog.tsx           # Dialog wrapper for form
│   │   ├── csv-import.tsx            # CSV upload component
│   │   ├── csv-preview.tsx           # Preview parsed CSV
│   │   └── delete-trip-dialog.tsx    # Delete confirmation
│   │
│   ├── assignments/
│   │   ├── assignment-table.tsx      # Assignments data table
│   │   ├── assignment-card.tsx       # Single assignment card
│   │   ├── edit-assignment-dialog.tsx # Change driver dialog
│   │   ├── auto-assign-button.tsx    # AI assign trigger
│   │   └── export-dropdown.tsx       # Export options
│   │
│   ├── calendar/
│   │   ├── calendar-view.tsx         # Main calendar component
│   │   ├── calendar-header.tsx       # Month navigation
│   │   ├── calendar-grid.tsx         # Day grid
│   │   ├── calendar-day.tsx          # Single day cell
│   │   ├── day-detail-sheet.tsx      # Day details sidebar
│   │   └── driver-avatar.tsx         # Small driver indicator
│   │
│   └── chat/
│       ├── chat-container.tsx        # Main chat layout
│       ├── message-list.tsx          # Message history
│       ├── message-bubble.tsx        # Single message
│       └── chat-input.tsx            # Input with send button
│
├── hooks/
│   ├── use-drivers.ts                # Driver queries & mutations (TanStack Query + Server Actions)
│   ├── use-trips.ts                  # Trip queries & mutations
│   ├── use-assignments.ts            # Assignment queries & mutations
│   ├── use-dashboard.ts              # Dashboard queries
│   ├── use-ai-assign.ts              # AI assignment mutation
│   ├── use-chat.ts                   # Chat functionality
│   └── use-mobile.ts                 # Mobile detection
│
├── lib/
│   ├── utils.ts                      # Utility functions
│   ├── types.ts                      # TypeScript interfaces
│   ├── constants.ts                  # App constants
│   ├── query-keys.ts                 # TanStack Query keys
│   ├── gemini.ts                     # Gemini AI client
│   ├── csv-parser.ts                 # CSV parsing logic
│   └── prisma.ts                     # Prisma client
│
├── store/
│   └── app-store.ts                  # Zustand store
│
├── context/
│   └── QueryProvider.tsx             # TanStack Query provider (already exists)
│
└── prisma/
    └── schema.prisma                 # Database schema
```

---

## Data Types

```typescript
// lib/types.ts

export interface Driver {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  availability: DriverAvailability[];
}

export interface DriverAvailability {
  id: string;
  driverId: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  isAvailable: boolean;
}

export interface Trip {
  id: string;
  tripId: string;        // e.g., "T-115JCVWMY"
  tripDate: Date;
  dayOfWeek: number;     // 0-6
  tripStage: string;     // "Upcoming" | "Canceled"
  weekUploadId?: string;
  createdAt: Date;
  assignment?: TripAssignment;
}

export interface TripAssignment {
  id: string;
  tripId: string;
  driverId: string;
  driver?: Driver;
  assignedAt: Date;
  isAutoAssigned: boolean; // true = AI assigned, false = manual
  aiReasoning?: string;
}

export interface WeekUpload {
  id: string;
  fileName: string;
  uploadedAt: Date;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalTrips: number;
  assignedTrips: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

// Server Action Response Type
export type ActionResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

// Helper types
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_NAMES = [
  "Sunday",
  "Monday", 
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
] as const;

export const DAY_NAMES_SHORT = [
  "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
] as const;
```

---

## Page Specifications

### Navigation Structure

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR (Desktop)              │  MAIN CONTENT             │
├─────────────────────────────────┼───────────────────────────┤
│                                 │                           │
│  ┌─────────────────────────┐   │   ┌─────────────────────┐ │
│  │ 🚚 Trip Scheduler       │   │   │  Header + Actions   │ │
│  └─────────────────────────┘   │   └─────────────────────┘ │
│                                 │                           │
│  ┌─────────────────────────┐   │   ┌─────────────────────┐ │
│  │ 📊 Dashboard            │   │   │                     │ │
│  │ 🚛 Trips                │   │   │   Page Content      │ │
│  │ 👥 Drivers              │   │   │                     │ │
│  │ 📋 Assignments          │   │   │                     │ │
│  │ 📅 Calendar             │   │   │                     │ │
│  │ 💬 Chat                 │   │   │                     │ │
│  └─────────────────────────┘   │   └─────────────────────┘ │
│                                 │                           │
└─────────────────────────────────┴───────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  MOBILE BOTTOM NAV                                          │
├─────────────────────────────────────────────────────────────┤
│   📊        🚛        👥        📋        📅               │
│  Home     Trips    Drivers   Assign   Calendar             │
└─────────────────────────────────────────────────────────────┘
```

---

### Page 1: Dashboard (`/`)

**Purpose**: Overview of the system, quick stats, and shortcuts to common actions.

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                                                   │
│  Overview of your trip scheduling system                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │ Total       │ │ This Week   │ │ Assigned    │ │Pending │ │
│  │ Drivers     │ │ Trips       │ │             │ │        │ │
│  │     12      │ │     48      │ │     42      │ │   6    │ │
│  │ 👥 +2 new   │ │ 🚛 ↑12%     │ │ ✅ 87.5%   │ │ ⏳     │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
│                                                              │
│  ┌──────────────────────────────┐ ┌────────────────────────┐ │
│  │ Quick Actions                │ │ Recent Activity        │ │
│  │                              │ │                        │ │
│  │ [+ Add Driver]               │ │ • Trip T-123 assigned  │ │
│  │ [+ Add Trip]                 │ │ • CSV imported (12)    │ │
│  │ [📁 Import CSV]              │ │ • Driver John added    │ │
│  │ [🤖 Auto-Assign]             │ │                        │ │
│  └──────────────────────────────┘ └────────────────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Pending Assignments                          [View All →]││
│  │                                                          ││
│  │ Trip ID      │ Date       │ Day    │ Status   │ Action  ││
│  │ T-115JCV...  │ Jan 15     │ Wed    │ Pending  │ [Assign]││
│  │ T-114MJQ...  │ Jan 15     │ Wed    │ Pending  │ [Assign]││
│  │ T-116S9V...  │ Jan 16     │ Thu    │ Pending  │ [Assign]││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Components**:
- `StatsGrid`: 4 stat cards in responsive grid
- `QuickActions`: Action buttons card
- `RecentActivity`: Activity feed (optional)
- `PendingTrips`: Table of unassigned trips

---

### Page 2: Drivers (`/drivers`)

**Purpose**: Manage drivers and their weekly availability.

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Drivers                                      [+ Add Driver] │
│  Manage your drivers and their availability                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🔍 Search drivers...                      [Filter ▾]    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Name          │ Availability              │ Actions      ││
│  ├───────────────┼───────────────────────────┼──────────────┤│
│  │ John Smith    │ ● ● ● ● ○ ○ ○            │ [Edit] [Del] ││
│  │               │ S M T W T F S            │              ││
│  ├───────────────┼───────────────────────────┼──────────────┤│
│  │ Maria Garcia  │ ○ ● ● ● ● ● ○            │ [Edit] [Del] ││
│  │               │ S M T W T F S            │              ││
│  ├───────────────┼───────────────────────────┼──────────────┤│
│  │ Alex Johnson  │ ● ○ ○ ○ ● ● ●            │ [Edit] [Del] ││
│  │               │ S M T W T F S            │              ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  Showing 3 of 12 drivers                    [← 1 2 3 ... →] │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ADD/EDIT DRIVER DIALOG                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Add New Driver                                     [X]  ││
│  │                                                          ││
│  │ Name *                                                   ││
│  │ ┌─────────────────────────────────────────────────────┐ ││
│  │ │ Enter driver name                                   │ ││
│  │ └─────────────────────────────────────────────────────┘ ││
│  │                                                          ││
│  │ Available Days *                                         ││
│  │ Select the days this driver is available                 ││
│  │                                                          ││
│  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ││
│  │ │ Sun │ │ Mon │ │ Tue │ │ Wed │ │ Thu │ │ Fri │ │ Sat │ ││
│  │ │  ○  │ │  ●  │ │  ●  │ │  ●  │ │  ●  │ │  ○  │ │  ○  │ ││
│  │ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ ││
│  │                                                          ││
│  │                              [Cancel]  [Save Driver]     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Components**:
- `DriverTable`: Data table with search/filter
- `DriverDialog`: Add/Edit dialog
- `DriverForm`: Form with name + availability
- `AvailabilityPicker`: 7-day toggle component
- `DeleteDriverDialog`: Confirmation dialog

---

### Page 3: Trips (`/trips`)

**Purpose**: View, add, and import trips.

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Trips                                          [+ Add Trip] │
│  Manage trips and import from CSV                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [Manual Entry]  [Import CSV]                            ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  MANUAL ENTRY TAB:                                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Trip ID *                    Date *                      ││
│  │ ┌───────────────────────┐   ┌───────────────────────┐   ││
│  │ │ T-                    │   │ 📅 Pick a date        │   ││
│  │ └───────────────────────┘   └───────────────────────┘   ││
│  │                                                          ││
│  │                                          [Add Trip]      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  IMPORT CSV TAB:                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  ┌───────────────────────────────────────────────────┐  ││
│  │  │                                                   │  ││
│  │  │        📁 Drag & drop your CSV file here         │  ││
│  │  │              or click to browse                   │  ││
│  │  │                                                   │  ││
│  │  └───────────────────────────────────────────────────┘  ││
│  │                                                          ││
│  │  Expected columns: Trip ID, Stop 1 Planned Arrival Date  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ All Trips                                   [Filter ▾]   ││
│  │                                                          ││
│  │ Trip ID       │ Date       │ Day  │ Status   │ Driver   ││
│  ├───────────────┼────────────┼──────┼──────────┼──────────┤│
│  │ T-115JCVWMY   │ Jan 15     │ Wed  │ Assigned │ John S.  ││
│  │ T-114MJQ2Q2   │ Jan 15     │ Wed  │ Pending  │ -        ││
│  │ T-116S9V7GD   │ Jan 16     │ Thu  │ Pending  │ -        ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Components**:
- `TripTabs`: Tab navigation (Manual/CSV)
- `TripForm`: Manual entry form
- `CSVImport`: Drag-drop uploader
- `CSVPreview`: Preview before import
- `TripTable`: Data table with filters

---

### Page 4: Assignments (`/assignments`)

**Purpose**: View and manage driver assignments, run AI auto-assign.

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Assignments                                                 │
│  View and manage driver assignments                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Total Trips │ │ Assigned    │ │ Pending     │            │
│  │     48      │ │     42      │ │     6       │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │  [🤖 Auto-Assign with AI]              [Export ▾]       ││
│  │                                                          ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Trip ID      │ Date    │ Day │ Driver      │ Reasoning   ││
│  ├──────────────┼─────────┼─────┼─────────────┼─────────────┤│
│  │ T-115JCVWMY  │ Jan 15  │ Wed │ John Smith  │ Available,  ││
│  │              │         │     │ [Change ▾]  │ balanced    ││
│  ├──────────────┼─────────┼─────┼─────────────┼─────────────┤│
│  │ T-114MJQ2Q2  │ Jan 15  │ Wed │ ⚠️ Pending  │ -           ││
│  │              │         │     │ [Assign ▾]  │             ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  AI PROCESSING MODAL:                                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │   🤖 AI is assigning drivers...                         ││
│  │                                                          ││
│  │   ████████████░░░░░░░░ 60%                              ││
│  │                                                          ││
│  │   Processing 48 trips...                                 ││
│  │   ✓ 29 assigned                                          ││
│  │   ⏳ 19 remaining                                        ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Components**:
- `AssignmentStats`: Summary cards
- `AutoAssignButton`: Triggers AI assignment
- `AssignmentTable`: Main data table
- `EditAssignmentDialog`: Change driver dropdown
- `ExportDropdown`: CSV/Clipboard options
- `AIProcessingModal`: Loading state for AI

---

### Page 5: Calendar (`/calendar`)

**Purpose**: Visual calendar showing driver availability per day.

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Calendar                                                    │
│  View driver availability by date                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  [←]       January 2026        [→]         [Today]      ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Sun    │ Mon    │ Tue    │ Wed    │ Thu    │ Fri  │ Sat ││
│  ├────────┼────────┼────────┼────────┼────────┼──────┼─────┤│
│  │        │        │        │   1    │   2    │   3  │  4  ││
│  │        │        │        │ 🟢 4   │ 🟢 5   │ 🟢 4 │🟢 3 ││
│  │        │        │        │ 📦 2   │ 📦 3   │ 📦 1 │📦 2 ││
│  ├────────┼────────┼────────┼────────┼────────┼──────┼─────┤│
│  │   5    │   6    │   7    │   8    │   9    │  10  │ 11  ││
│  │ 🟢 3   │ 🟢 6   │ 🟢 6   │ 🟢 6   │ 🟢 5   │ 🟢 4 │🟢 3 ││
│  │ 📦 0   │ 📦 5   │ 📦 4   │ 📦 6   │ 📦 3   │ 📦 2 │📦 1 ││
│  ├────────┼────────┼────────┼────────┼────────┼──────┼─────┤│
│  │  ...   │  ...   │  ...   │  ...   │  ...   │ ...  │ ... ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  Legend: 🟢 Available drivers  📦 Trips scheduled            │
│                                                              │
│  DAY DETAIL SHEET (click on day):                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Wednesday, January 15, 2026                        [X]  ││
│  │                                                          ││
│  │ Available Drivers (4)                                    ││
│  │ ┌─────────────────────────────────────────────────────┐ ││
│  │ │ 👤 John Smith                                       │ ││
│  │ │ 👤 Maria Garcia                                     │ ││
│  │ │ 👤 Alex Johnson                                     │ ││
│  │ │ 👤 Sarah Wilson                                     │ ││
│  │ └─────────────────────────────────────────────────────┘ ││
│  │                                                          ││
│  │ Scheduled Trips (2)                                      ││
│  │ ┌─────────────────────────────────────────────────────┐ ││
│  │ │ T-115JCVWMY → John Smith                            │ ││
│  │ │ T-114MJQ2Q2 → Pending                               │ ││
│  │ └─────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Components**:
- `CalendarHeader`: Month navigation
- `CalendarGrid`: 7-column day grid
- `CalendarDay`: Single day cell
- `DayDetailSheet`: Slide-out details
- `DriverAvatar`: Small driver indicator

---

### Page 6: Chat (`/chat`) - Optional

**Purpose**: AI chat assistant for questions and commands.

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  AI Assistant                                                │
│  Ask questions about schedules and drivers                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │  ┌─────────────────────────────────────────────────────┐ ││
│  │  │ 🤖 Hi! I'm your Trip Scheduler assistant.          │ ││
│  │  │    I can help you with:                            │ ││
│  │  │    • Check driver availability                     │ ││
│  │  │    • View trip assignments                         │ ││
│  │  │    • Answer scheduling questions                   │ ││
│  │  └─────────────────────────────────────────────────────┘ ││
│  │                                                          ││
│  │                    ┌────────────────────────────────────┐││
│  │                    │ Who is available on Thursday?     │││
│  │                    └────────────────────────────────────┘││
│  │                                                          ││
│  │  ┌─────────────────────────────────────────────────────┐ ││
│  │  │ 🤖 There are 5 drivers available on Thursday:      │ ││
│  │  │                                                     │ ││
│  │  │    1. John Smith (2 trips assigned)                │ ││
│  │  │    2. Maria Garcia (1 trip assigned)               │ ││
│  │  │    3. Alex Johnson (3 trips assigned)              │ ││
│  │  │    4. Sarah Wilson (0 trips assigned)              │ ││
│  │  │    5. Mike Brown (1 trip assigned)                 │ ││
│  │  │                                                     │ ││
│  │  │    Sarah Wilson has the lightest workload.         │ ││
│  │  └─────────────────────────────────────────────────────┘ ││
│  │                                                          ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Type your message...                            [Send]   ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Components**:
- `ChatContainer`: Main layout
- `MessageList`: Scrollable messages
- `MessageBubble`: User/AI message
- `ChatInput`: Input field + send button

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

---

### Phase 5: Assignments Page

**Prompt for Claude Code CLI**:

```
Create the Assignments page (app/assignments/page.tsx) for Trip Scheduler using Server Actions.

REQUIREMENTS:

1. Page Header:
- Title: "Assignments"
- Subtitle: "View and manage driver assignments"

2. Stats Summary:
- 3 cards inline: Total, Assigned, Pending
- Compact design

3. Action Bar:
- "Auto-Assign with AI" button (primary, with sparkles icon)
- Export dropdown:
  • Export to CSV
  • Copy to Clipboard

4. Assignments Table (components/assignments/assignment-table.tsx):
- Columns:
  • Trip ID (monospace font)
  • Date
  • Day
  • Driver (dropdown to change)
  • AI Reasoning (truncated, tooltip)
- Pending rows highlighted
- Sortable columns

5. Driver Selection:
- Dropdown showing only available drivers for that day
- Shows driver name
- "Unassigned" option
- Filter drivers by dayOfWeek

6. AI Auto-Assign Flow:
- Click "Auto-Assign" button
- Show processing modal
- Call Gemini API via server action
- Update assignments
- Show results summary
- Toast notification

7. AI Processing Modal:
- Title: "AI is assigning drivers..."
- Progress indicator
- Stats: X assigned, X remaining
- Cancel button (optional)

8. Export Functionality:
- CSV format: Trip ID, Date, Day, Driver Name
- Clipboard: Same format, tab-separated
- Success toast

DESIGN SPECS:
- Action bar: flex justify-between items-center
- Stats cards: inline-flex gap-4
- Monospace for Trip ID: font-mono text-sm
- Reasoning tooltip: max-w-xs

SHADCN COMPONENTS:
- Table
- Select (for driver dropdown)
- DropdownMenu (for export)
- Dialog (for AI modal)
- Progress
- Tooltip
- Toast

SERVER ACTIONS (actions/assignment-actions.ts):
```typescript
"use server"

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type ActionResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

export async function getAssignments(): Promise<ActionResponse<any[]>> {
  try {
    const assignments = await prisma.trip.findMany({
      where: { tripStage: "Upcoming" },
      include: {
        assignment: {
          include: { driver: true }
        }
      },
      orderBy: { tripDate: "asc" }
    });
    return { success: true, data: assignments };
  } catch (error) {
    return { success: false, error: "Failed to fetch assignments" };
  }
}

export async function getAssignmentStats(): Promise<ActionResponse<{ total: number; assigned: number; pending: number }>> {
  try {
    const [total, assigned, pending] = await Promise.all([
      prisma.trip.count({ where: { tripStage: "Upcoming" } }),
      prisma.trip.count({
        where: {
          tripStage: "Upcoming",
          assignment: { isNot: null }
        }
      }),
      prisma.trip.count({
        where: {
          tripStage: "Upcoming",
          assignment: null
        }
      })
    ]);

    return { success: true, data: { total, assigned, pending } };
  } catch (error) {
    return { success: false, error: "Failed to fetch stats" };
  }
}

export async function updateAssignment(tripId: string, driverId: string | null): Promise<ActionResponse<any>> {
  try {
    if (driverId === null) {
      await prisma.tripAssignment.delete({
        where: { tripId }
      });
    } else {
      await prisma.tripAssignment.upsert({
        where: { tripId },
        create: {
          tripId,
          driverId,
          isAutoAssigned: false
        },
        update: {
          driverId,
          isAutoAssigned: false
        }
      });
    }

    revalidatePath("/assignments");
    revalidatePath("/");
    return { success: true, data: { tripId, driverId } };
  } catch (error) {
    return { success: false, error: "Failed to update assignment" };
  }
}

export async function getAvailableDriversForDay(dayOfWeek: number): Promise<ActionResponse<any[]>> {
  try {
    const drivers = await prisma.driver.findMany({
      where: {
        isActive: true,
        availability: {
          some: {
            dayOfWeek,
            isAvailable: true
          }
        }
      },
      orderBy: { name: "asc" }
    });
    return { success: true, data: drivers };
  } catch (error) {
    return { success: false, error: "Failed to fetch available drivers" };
  }
}
```

HOOKS (hooks/use-assignments.ts):
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
  getAssignments,
  getAssignmentStats,
  updateAssignment,
  getAvailableDriversForDay,
} from "@/actions/assignment-actions";

// Query: List all assignments
export function useAssignments() {
  return useQuery({
    queryKey: queryKeys.assignments.list(),
    queryFn: async () => {
      const result = await getAssignments();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

// Query: Assignment stats
export function useAssignmentStats() {
  return useQuery({
    queryKey: queryKeys.assignments.stats(),
    queryFn: async () => {
      const result = await getAssignmentStats();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

// Query: Available drivers for a specific day
export function useAvailableDrivers(dayOfWeek: number) {
  return useQuery({
    queryKey: [...queryKeys.drivers.all, "available", dayOfWeek],
    queryFn: async () => {
      const result = await getAvailableDriversForDay(dayOfWeek);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: dayOfWeek >= 0 && dayOfWeek <= 6,
  });
}

// Mutation: Update assignment
export function useUpdateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, driverId }: { tripId: string; driverId: string | null }) => {
      const result = await updateAssignment(tripId, driverId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success("Assignment updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update assignment");
    },
  });
}
```

EXPORT FUNCTION (client-side):
```typescript
export function exportToCSV(assignments: Assignment[]) {
  const headers = ["Trip ID", "Date", "Day", "Driver"];
  const rows = assignments.map(a => [
    a.tripId,
    format(a.tripDate, "yyyy-MM-dd"),
    DAY_NAMES[a.dayOfWeek],
    a.assignment?.driver?.name || "Unassigned"
  ]);

  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `assignments-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
}

export function copyToClipboard(assignments: Assignment[]) {
  const rows = assignments.map(a => 
    `${a.tripId}\t${format(a.tripDate, "yyyy-MM-dd")}\t${DAY_NAMES[a.dayOfWeek]}\t${a.assignment?.driver?.name || "Unassigned"}`
  );
  navigator.clipboard.writeText(rows.join("\n"));
}
```
```

---

### Phase 6: Calendar Page

**Prompt for Claude Code CLI**:

```
Create the Calendar page (app/calendar/page.tsx) for Trip Scheduler.

REQUIREMENTS:

1. Page Header:
- Title: "Calendar"
- Subtitle: "View driver availability by date"

2. Calendar Header (components/calendar/calendar-header.tsx):
- Previous month button
- Current month/year display (e.g., "January 2026")
- Next month button
- "Today" button

3. Calendar Grid (components/calendar/calendar-grid.tsx):
- 7 columns (Sun-Sat)
- Day name headers
- 5-6 rows for dates
- Current month dates
- Previous/next month dates (muted)

4. Calendar Day Cell (components/calendar/calendar-day.tsx):
- Date number (top-left)
- Today indicator (ring or background)
- Available drivers count (green badge)
- Trips count (blue badge)
- Clickable to open details
- Hover effect

5. Day Detail Sheet (components/calendar/day-detail-sheet.tsx):
- Slides in from right
- Header: Full date (e.g., "Wednesday, January 15, 2026")
- Section: Available Drivers
  • List of driver names
  • Empty state if none
- Section: Scheduled Trips
  • Trip ID with assigned driver
  • Status badge
- Close button

6. Visual Indicators:
- 🟢 Number = Available drivers
- 📦 Number = Trips scheduled
- Color intensity based on count (optional)

DESIGN SPECS:
- Grid: grid-cols-7 gap-px bg-border
- Day cell: bg-background p-2 min-h-24
- Today: ring-2 ring-primary
- Outside month: text-muted-foreground/50
- Sheet width: w-80 md:w-96

SHADCN COMPONENTS:
- Button
- Sheet, SheetContent, SheetHeader
- Badge
- ScrollArea
- Separator

DATE HANDLING:
- Use date-fns
- startOfMonth, endOfMonth
- eachDayOfInterval
- format, isSameMonth, isToday
- getDay for day of week

RESPONSIVE:
- Desktop: Full calendar grid
- Mobile: Scrollable horizontally or list view
```

---

### Phase 7: AI Integration

**Prompt for Claude Code CLI**:

```
Create Gemini AI integration for Trip Scheduler auto-assignment using Server Actions.

NOTE: Gemini client (lib/gemini.ts) is already configured with exports: genAI, MODEL_NAME

REQUIREMENTS:

1. Server Action (actions/ai-actions.ts):
```typescript
"use server"

import prisma from "@/lib/prisma";
import { genAI, MODEL_NAME } from "@/lib/gemini";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================
// VALIDATION SCHEMAS
// ============================================

const AIAssignmentSchema = z.object({
  tripId: z.string().min(1, "tripId is required"),
  driverId: z.string().min(1, "driverId is required"),
  reasoning: z.string().default("No reasoning provided")
});

const AIResponseSchema = z.object({
  assignments: z.array(AIAssignmentSchema),
  summary: z.string().optional(),
  warnings: z.array(z.string()).optional().default([])
});

type AIResponse = z.infer<typeof AIResponseSchema>;

interface AssignmentResult {
  success: boolean;
  assignments?: {
    tripId: string;
    driverId: string;
    reasoning: string;
  }[];
  summary?: string;
  warnings?: string[];
  error?: string;
}

// ============================================
// AI RESPONSE PARSING (Robust)
// ============================================

/**
 * Extracts and validates JSON from AI response text
 * Handles markdown code blocks, raw JSON, and malformed responses
 */
function parseAIResponse(text: string): AIResponse {
  if (!text || typeof text !== "string") {
    throw new Error("Empty response from AI");
  }

  // Patterns to try (in order of preference)
  const patterns = [
    /```json\s*([\s\S]*?)\s*```/,   // ```json ... ```
    /```\s*([\s\S]*?)\s*```/,        // ``` ... ```
    /(\{[\s\S]*"assignments"[\s\S]*\})/,  // Object with assignments key
  ];

  let jsonStr = text.trim();

  // Try each pattern to extract JSON
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      jsonStr = match[1].trim();
      break;
    }
  }

  // Attempt to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (parseError) {
    // Try to fix common JSON issues
    try {
      // Remove trailing commas before ] or }
      const fixed = jsonStr
        .replace(/,\s*]/g, "]")
        .replace(/,\s*}/g, "}");
      parsed = JSON.parse(fixed);
    } catch {
      throw new Error(
        `Failed to parse AI response as JSON. ` +
        `Raw response: ${text.substring(0, 200)}...`
      );
    }
  }

  // Validate structure with zod
  const result = AIResponseSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues
      .map(i => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new Error(`Invalid AI response structure: ${issues}`);
  }

  return result.data;
}

// ============================================
// MAIN AUTO-ASSIGN FUNCTION
// ============================================

export async function autoAssignDrivers(): Promise<AssignmentResult> {
  try {
    // Fetch unassigned trips
    const trips = await prisma.trip.findMany({
      where: { assignment: null, tripStage: "Upcoming" },
      select: { id: true, tripId: true, tripDate: true, dayOfWeek: true }
    });

    if (trips.length === 0) {
      return { success: true, summary: "No unassigned trips to process", assignments: [] };
    }

    // Fetch active drivers with availability
    const drivers = await prisma.driver.findMany({
      where: { isActive: true },
      include: { availability: { where: { isAvailable: true } } }
    });

    if (drivers.length === 0) {
      return { success: false, error: "No active drivers available" };
    }

    // Build prompt
    const prompt = buildAssignmentPrompt(trips, drivers);

    // Call Gemini AI
    const response = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    const text = response.text || "";

    // Parse and validate AI response
    const parsed = parseAIResponse(text);

    // Validate that tripIds and driverIds exist in our data
    const tripIdSet = new Set(trips.map(t => t.id));
    const driverIdSet = new Set(drivers.map(d => d.id));
    const warnings: string[] = [...(parsed.warnings || [])];

    const validAssignments = parsed.assignments.filter(a => {
      if (!tripIdSet.has(a.tripId)) {
        warnings.push(`Skipped invalid trip ID: ${a.tripId}`);
        return false;
      }
      if (!driverIdSet.has(a.driverId)) {
        warnings.push(`Skipped invalid driver ID: ${a.driverId}`);
        return false;
      }
      return true;
    });

    // Create assignments in database (use transaction for atomicity)
    await prisma.$transaction(
      validAssignments.map(assignment =>
        prisma.tripAssignment.create({
          data: {
            tripId: assignment.tripId,
            driverId: assignment.driverId,
            isAutoAssigned: true,
            aiReasoning: assignment.reasoning
          }
        })
      )
    );

    revalidatePath("/assignments");
    revalidatePath("/trips");

    return {
      success: true,
      assignments: validAssignments,
      summary: parsed.summary || `Assigned ${validAssignments.length} trips`,
      warnings
    };
  } catch (error) {
    console.error("AI Assignment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

function buildAssignmentPrompt(
  trips: { id: string; tripId: string; tripDate: Date; dayOfWeek: number }[],
  drivers: { id: string; name: string; availability: { dayOfWeek: number }[] }[]
) {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  const driversData = drivers.map(d => ({
    id: d.id,
    name: d.name,
    availableDays: d.availability.map(a => dayNames[a.dayOfWeek])
  }));

  const tripsData = trips.map(t => ({
    id: t.id,
    tripId: t.tripId,
    date: t.tripDate.toISOString().split('T')[0],
    dayOfWeek: dayNames[t.dayOfWeek]
  }));

  return `You are a fleet scheduling assistant for Peak Transport.

TASK: Assign drivers to trips based on availability.

RULES:
1. Only assign a driver if they are available on the trip's day of week
2. Balance workload - try to give each driver a similar number of trips
3. Provide a brief reasoning for each assignment
4. If no driver is available for a trip, do not include it in assignments

DRIVERS:
${JSON.stringify(driversData, null, 2)}

TRIPS TO ASSIGN:
${JSON.stringify(tripsData, null, 2)}

OUTPUT FORMAT (JSON only, no markdown code blocks):
{
  "assignments": [
    {"tripId": "trip-db-id", "driverId": "driver-db-id", "reasoning": "brief reason"}
  ],
  "summary": "Assigned X trips to Y drivers",
  "warnings": ["any issues or unassigned trips"]
}

Respond with only valid JSON, no additional text.`;
}
```

2. Hook (hooks/use-ai-assign.ts):
```typescript
"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { autoAssignDrivers } from "@/actions/ai-actions";
import { toast } from "sonner";

export function useAIAssign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: autoAssignDrivers,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.summary || "Drivers assigned successfully");
        queryClient.invalidateQueries({ queryKey: ["trips"] });
        queryClient.invalidateQueries({ queryKey: ["assignments"] });
        
        if (data.warnings && data.warnings.length > 0) {
          data.warnings.forEach(warning => toast.warning(warning));
        }
      } else {
        toast.error(data.error || "Failed to assign drivers");
      }
    },
    onError: (error) => {
      toast.error("An error occurred while assigning drivers");
      console.error(error);
    }
  });
}
```

ENVIRONMENT:
- GEMINI_API_KEY in .env.local (server-side, no NEXT_PUBLIC prefix)
```

---

### Phase 8: Chat Page (Optional)

**Prompt for Claude Code CLI**:

```
Create the AI Chat page (app/chat/page.tsx) for Trip Scheduler using Server Actions.

REQUIREMENTS:

1. Page Layout:
- Full height container
- Messages area (scrollable)
- Input area (fixed bottom)

2. Chat Container (components/chat/chat-container.tsx):
- Flex column layout
- ScrollArea for messages
- Auto-scroll to bottom

3. Message List (components/chat/message-list.tsx):
- Map through messages
- Group by date (optional)
- Loading indicator for AI response

4. Message Bubble (components/chat/message-bubble.tsx):
- User messages: Right-aligned, primary bg
- AI messages: Left-aligned, muted bg
- Avatar/icon
- Timestamp (optional)
- Markdown support for AI responses

5. Chat Input (components/chat/chat-input.tsx):
- Textarea (auto-resize)
- Send button
- Enter to send (Shift+Enter for newline)
- Disabled while loading

6. AI Context:
- Send current data context:
  • Drivers (names, availability)
  • Trips (IDs, dates, assignments)
  • Stats summary
- AI can reference actual data

7. Suggested Questions:
- Show when chat is empty:
  • "Who is available on Thursday?"
  • "How many trips are unassigned?"
  • "Which driver has the most trips?"

8. Chat Functionality:
- Create hooks/use-chat.ts
- Store messages in React state
- Clear chat option
- Handle errors gracefully

DESIGN SPECS:
- User message: bg-primary text-primary-foreground
- AI message: bg-muted
- Border radius: rounded-2xl
- Max bubble width: max-w-[80%]
- Input area: border-t p-4

SHADCN COMPONENTS:
- ScrollArea
- Textarea
- Button
- Avatar

SERVER ACTION (actions/chat-actions.ts):
```typescript
"use server"

import prisma from "@/lib/prisma";
import { genAI, MODEL_NAME } from "@/lib/gemini";

export async function sendChatMessage(message: string) {
  try {
    // Get current context
    const [drivers, trips, stats] = await Promise.all([
      prisma.driver.findMany({
        where: { isActive: true },
        include: { availability: true }
      }),
      prisma.trip.findMany({
        where: { tripStage: "Upcoming" },
        include: { assignment: { include: { driver: true } } }
      }),
      getStats()
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
${JSON.stringify(drivers.map(d => ({
  name: d.name,
  availableDays: d.availability
    .filter(a => a.isAvailable)
    .map(a => dayNames[a.dayOfWeek])
})), null, 2)}

TRIPS:
${JSON.stringify(trips.slice(0, 20).map(t => ({
  tripId: t.tripId,
  date: t.tripDate.toISOString().split('T')[0],
  day: dayNames[t.dayOfWeek],
  driver: t.assignment?.driver?.name || "Unassigned"
})), null, 2)}

USER QUESTION: ${message}

Respond helpfully and concisely. Reference actual data when possible.
If user wants to make changes, explain what actions to take in the app.
`;

    const response = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return { success: true, response: response.text || "" };
  } catch (error) {
    console.error("Chat error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get response"
    };
  }
}

async function getStats() {
  const [total, assigned, pending] = await Promise.all([
    prisma.trip.count({ where: { tripStage: "Upcoming" } }),
    prisma.trip.count({ 
      where: { tripStage: "Upcoming", assignment: { isNot: null } }
    }),
    prisma.trip.count({ 
      where: { tripStage: "Upcoming", assignment: null }
    })
  ]);
  return { total, assigned, pending };
}
```

HOOK (hooks/use-chat.ts):
```typescript
"use client"

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendChatMessage } from "@/actions/chat-actions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);

  const mutation = useMutation({
    mutationFn: sendChatMessage,
    onMutate: (message) => {
      // Add user message immediately
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        createdAt: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
    },
    onSuccess: (data) => {
      if (data.success && data.response) {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.response,
          createdAt: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    }
  });

  const sendMessage = (content: string) => {
    mutation.mutate(content);
  };

  const clearChat = () => setMessages([]);

  return {
    messages,
    sendMessage,
    clearChat,
    isLoading: mutation.isPending
  };
}
```
```

---

### Phase 9: Polish & Testing

**Prompt for Claude Code CLI**:

```
Polish and finalize Trip Scheduler app.

TASKS:

1. Loading States:
- Add Skeleton components to all pages
- Show while data is loading
- Consistent skeleton patterns

2. Empty States:
- All tables/lists have empty states
- Illustration + message + action button
- Consistent design

3. Error Handling:
- Form validation messages
- API error toasts
- Fallback UI for errors

4. Responsive Audit:
- Test all pages at 320px, 768px, 1024px, 1440px
- Fix any overflow issues
- Ensure touch targets are 44px+

5. Accessibility:
- All buttons have aria-labels
- Form inputs have labels
- Focus states visible
- Keyboard navigation works

6. Performance:
- Lazy load heavy components
- Optimize images (if any)
- Minimize re-renders

7. Consistency Check:
- Same spacing across pages
- Same button styles
- Same card patterns
- Same typography

8. Final Touches:
- Page transitions (optional)
- Hover animations
- Success animations (optional)

TEST CHECKLIST:
- [ ] Add driver → appears in list
- [ ] Edit driver → changes saved
- [ ] Delete driver → removed from list
- [ ] Add trip manually → appears in list
- [ ] Import CSV → trips created
- [ ] Auto-assign → drivers assigned
- [ ] Change assignment → updates
- [ ] Export CSV → downloads file
- [ ] Calendar shows correct data
- [ ] Chat responds correctly
- [ ] All pages responsive
- [ ] All forms validate
- [ ] All toasts work
```

---

## Environment Variables

```env
# .env.local

# Database (PostgreSQL - works with Neon, Supabase, Railway, etc.)
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# AI (Server-side only - no NEXT_PUBLIC prefix)
GEMINI_API_KEY="your-gemini-api-key"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Existing Configuration Files

Your project already has these configured:

**lib/prisma.ts** - Prisma 7 with pg adapter:
- Uses `@prisma/adapter-pg` for connection pooling
- Connection pool: max 10 connections
- Supports Neon, Supabase, Railway, or any PostgreSQL

**lib/gemini.ts** - Google GenAI:
- Exports: `genAI`, `MODEL_NAME`
- Model: `gemini-2.5-flash`
- Server-side only (uses `GEMINI_API_KEY`)

---

## Getting Started Commands

```bash
# Install dependencies
pnpm install

# Install shadcn components (sonner for toast notifications)
pnpm dlx shadcn@latest add button card dialog table input form tabs badge sonner alert-dialog sheet scroll-area separator skeleton select dropdown-menu calendar progress tooltip textarea avatar

# Install additional packages
pnpm add date-fns papaparse @tanstack/react-query zustand
pnpm add -D @types/papaparse

# Set up Prisma (initial setup)
pnpm dlx prisma generate
pnpm dlx prisma migrate dev --name init

# Run development server
pnpm dev
```

---

## Prisma Migration Commands

```bash
# Initial migration (first time setup)
pnpm dlx prisma migrate dev --name init

# Add new migration (when schema changes)
pnpm dlx prisma migrate dev --name added_driver_field
pnpm dlx prisma migrate dev --name added_trip_status
pnpm dlx prisma migrate dev --name updated_assignment_table

# Generate Prisma client (after schema changes)
pnpm dlx prisma generate

# View database in browser
pnpm dlx prisma studio

# Reset database (warning: deletes all data)
pnpm dlx prisma migrate reset

# Deploy migrations to production
pnpm dlx prisma migrate deploy

# Check migration status
pnpm dlx prisma migrate status
```

### Migration Best Practices

1. **Naming Conventions**: Use descriptive names
   - `init` - Initial schema
   - `add_driver_email` - Adding a field
   - `remove_unused_fields` - Removing fields
   - `update_trip_relations` - Changing relations

2. **Before Migrating**:
   - Review schema changes
   - Backup production data if needed
   - Test migration on development first

3. **Migration Files Location**: `prisma/migrations/`

---

## Success Criteria

- [ ] All 6 pages implemented and functional
- [ ] Consistent UI/UX across all pages
- [ ] Fully responsive (mobile to desktop)
- [ ] All CRUD operations work
- [ ] CSV import parses correctly
- [ ] AI assignment works with Gemini
- [ ] Calendar displays correct availability
- [ ] Export functionality works
- [ ] All forms have validation
- [ ] Loading and empty states implemented
- [ ] Toast notifications for all actions
- [ ] Keyboard accessible
- [ ] No console errors