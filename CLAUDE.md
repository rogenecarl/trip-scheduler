# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Trip Scheduler is a web application for scheduling trips and automatically assigning available drivers using AI (Gemini). See `prd/new-implementation.md` for full requirements and phased implementation plan.

## Development Commands

```bash
pnpm dev          # Start development server at localhost:3000
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

### Database (Prisma 7)

```bash
pnpm prisma generate    # Generate Prisma client (outputs to src/lib/generated/prisma)
pnpm prisma migrate dev # Run migrations in development
pnpm prisma studio      # Open Prisma Studio GUI
```

Note: Prisma 7 uses `@prisma/adapter-pg` for PostgreSQL connections. The client is configured in `src/lib/prisma.ts` with connection pooling.

## Architecture

This is a Next.js 16 application using the App Router with React 19.

### Project Structure

- `src/app/` - Next.js App Router pages and layouts
  - Uses route groups: `(landing)/` for landing page routes
- `src/components/ui/` - shadcn/ui components (new-york style)
- `src/components/` - Feature-specific components organized by domain (e.g., `landing/`)
- `src/context/` - React context providers (QueryProvider for TanStack Query)
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and generated code
  - `utils.ts` - Contains `cn()` helper for Tailwind class merging
  - `generated/prisma/` - Prisma client output location
  - `prisma.ts` - Database client singleton with connection pooling
  - `gemini.ts` - Google Gemini AI client configuration
  - `types.ts` - Shared TypeScript interfaces (Driver, Trip, etc.)
  - `constants.ts` - App-wide constants and navigation items

### Key Technologies

- **UI**: shadcn/ui with Radix primitives, Tailwind CSS 4, Lucide icons
- **Forms**: react-hook-form with zod validation
- **Data Fetching**: TanStack Query (React Query)
- **Database**: PostgreSQL with Prisma ORM (using @prisma/adapter-pg)
- **AI**: Google Gemini (gemini-2.5-flash model via @google/genai)
- **Notifications**: Sonner for toast notifications

### Path Aliases

- `@/*` maps to `./src/*`
- Component imports: `@/components/ui/button`, `@/lib/utils`, `@/hooks/use-mobile`

### Environment Variables

Required in `.env`:
- `DATABASE_URL` - PostgreSQL connection string (supports Neon, Supabase, etc.)
- `GEMINI_API_KEY` - Google Gemini API key for AI driver assignment
