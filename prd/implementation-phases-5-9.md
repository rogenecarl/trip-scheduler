# Trip Scheduler - Implementation Phases 5-9

This document contains the implementation phases 5 through 9 for the Trip Scheduler application.

> **Note**: This is part of the full implementation guide. See `new-implementation.md` for project overview, tech stack, database schema, design system, and other reference materials.

---

## Implementation Phases

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
