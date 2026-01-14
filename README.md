# Trip Scheduler

An intelligent trip scheduling application that automatically assigns drivers to trips using AI. Built with Next.js 16, React 19, and powered by Google Gemini AI.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma)

## Features

### Driver Management
- Add, edit, and delete drivers
- Set weekly availability for each driver (select available days)
- Bulk selection and deletion
- Search and filter drivers

### Trip Management
- Create individual trips or bulk import via CSV
- View trips with date, day, and assignment status
- Filter by pending/assigned status
- Bulk selection and deletion
- CSV export functionality

### AI-Powered Auto-Assignment
- One-click automatic driver assignment using Google Gemini AI
- Matches drivers to trips based on availability
- Handles 100+ trip assignments in seconds
- Provides AI reasoning for each assignment
- Zero scheduling conflicts guaranteed

### Assignment Management
- Manual driver assignment with dropdown selection
- Bulk unassign functionality
- View assignment status and AI analysis
- Export assignments to CSV

### Calendar View
- Monthly calendar overview
- Visual indicators for available drivers and scheduled trips
- Click any day to view detailed information
- See pending vs assigned trips at a glance

### Dashboard
- Real-time statistics (total drivers, trips, assigned, pending)
- Quick action shortcuts
- Pending trips overview
- Responsive design for all devices

## Tech Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/) with Radix primitives
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) + [TanStack Query](https://tanstack.com/query)

### Backend
- **Database**: PostgreSQL
- **ORM**: [Prisma 7](https://www.prisma.io/)
- **AI**: [Google Gemini](https://ai.google.dev/) (gemini-2.5-flash)
- **API**: Next.js Server Actions

### Developer Experience
- **Language**: TypeScript 5
- **Package Manager**: pnpm
- **Linting**: ESLint 9

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- pnpm (recommended) or npm
- PostgreSQL database (local or cloud: Neon, Supabase, etc.)
- Google Gemini API key

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/trip-scheduler.git
   cd trip-scheduler
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```env
   # Database connection string
   DATABASE_URL="postgresql://username:password@localhost:5432/trip_scheduler"

   # Google Gemini API key for AI assignments
   GEMINI_API_KEY="your-gemini-api-key"
   ```

4. **Set up the database**

   ```bash
   # Generate Prisma client
   pnpm prisma generate

   # Run database migrations
   pnpm prisma migrate dev
   ```

5. **Start the development server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Dashboard route group
│   │   └── dashboard/      # Dashboard pages
│   │       ├── assignments/
│   │       ├── calendar/
│   │       ├── drivers/
│   │       └── trips/
│   └── (landing)/          # Landing page route group
├── actions/                # Server actions
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── assignments/        # Assignment-related components
│   ├── calendar/           # Calendar components
│   ├── dashboard/          # Dashboard components
│   ├── drivers/            # Driver management components
│   ├── landing/            # Landing page components
│   ├── layout/             # Layout components
│   └── trips/              # Trip management components
├── context/                # React context providers
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and configurations
│   ├── generated/prisma/   # Generated Prisma client
│   ├── prisma.ts           # Database client
│   ├── gemini.ts           # AI client configuration
│   ├── types.ts            # TypeScript interfaces
│   └── utils.ts            # Utility functions
└── store/                  # Zustand stores
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `GEMINI_API_KEY` | Google Gemini API key for AI features | Yes |

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm prisma generate` | Generate Prisma client |
| `pnpm prisma migrate dev` | Run database migrations |
| `pnpm prisma studio` | Open Prisma Studio GUI |

## CSV Import Format

When importing trips via CSV, use the following format:

```csv
Trip ID,Trip Date
TRIP-001,2026-01-15
TRIP-002,2026-01-16
TRIP-003,2026-01-17
```

- **Trip ID**: Unique identifier for the trip
- **Trip Date**: Date in `YYYY-MM-DD` format

## Deployment

### Deploy on Vercel

The easiest way to deploy this app is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import your repository on Vercel
3. Add your environment variables (`DATABASE_URL`, `GEMINI_API_KEY`)
4. Deploy

### Other Platforms

This app can be deployed on any platform that supports Node.js:
- Railway
- Render
- DigitalOcean App Platform
- AWS Amplify
- Self-hosted with Docker

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with [Next.js](https://nextjs.org/) and [shadcn/ui](https://ui.shadcn.com/)
