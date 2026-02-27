# BuildWise

**AI-powered construction project management platform.**

BuildWise streamlines planning, field tracking, and cost estimation for construction firms. It uses Google Gemini AI to generate project schedules, analyze daily site logs, and predict material costs — backed by a real-time PostgreSQL database with role-based access control.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Supabase Configuration](#supabase-configuration)
- [Running the Application](#running-the-application)
- [User Roles & Permissions](#user-roles--permissions)
- [Core Modules](#core-modules)
- [AI Workflows](#ai-workflows)
- [Database Schema](#database-schema)
- [Edge Functions](#edge-functions)
- [Materials Library (DSR)](#materials-library-dsr)
- [Theming](#theming)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

- **3-Role Authentication** — Admin, Worker, and Client with granular Row Level Security
- **AI Schedule Generation** — Describe a project → get a full phase/task timeline with dependencies
- **AI Site Log Summarization** — Submit raw field notes → get structured Progress / Blockers / Next Steps
- **AI Cost Estimation** — Select a task → get a material-by-material cost breakdown from the DSR library
- **Gantt Timeline** — Visual project timeline with dependency chains and real date positioning
- **Materials Library** — 96 items from the Delhi Schedule of Rates with search and category filtering
- **4 Dashboard Themes** — Field Daylight, Night Shift, High Contrast, Calm Concrete
- **Accessibility** — Skip links, ARIA labels, focus rings, `prefers-reduced-motion` support
- **Real-time Data** — All components fetch live data from Supabase PostgreSQL

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 19.2 |
| **Build Tool** | Vite | 7.3 |
| **Styling** | Tailwind CSS | 3.4.17 |
| **Animation** | GSAP | 3.14 |
| **Icons** | Lucide React | 0.575 |
| **Database** | PostgreSQL (via Supabase) | 17 |
| **Auth** | Supabase Auth | Built-in |
| **API** | Supabase PostgREST + Edge Functions | Auto-generated |
| **AI** | Google Gemini 2.0 Flash | `@google/generative-ai` |
| **Edge Runtime** | Deno (Supabase Edge Functions) | — |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  React Frontend                  │
│  (Vite + Tailwind + GSAP + Lucide)              │
│                                                   │
│  LoginPage ─→ AuthContext ─→ Role-Based Routing  │
│  ┌──────────┬──────────┬──────────┬───────────┐  │
│  │ Overview │  Gantt   │  Logs    │ Materials │  │
│  └──────────┴──────────┴──────────┴───────────┘  │
└───────────────────────┬─────────────────────────┘
                        │ @supabase/supabase-js
                        ▼
┌─────────────────────────────────────────────────┐
│              Supabase Backend                    │
│                                                   │
│  ┌──────────────┐   ┌──────────────────────────┐│
│  │ PostgreSQL   │   │   Edge Functions (Deno)   ││
│  │ + RLS        │   │   ┌───────────────────┐   ││
│  │              │◄──│   │ summarize-log     │   ││
│  │ 8 Tables     │   │   │ estimate-cost     │   ││
│  │ 15 Indexes   │   │   │ generate-schedule │   ││
│  │              │   │   └───────┬───────────┘   ││
│  └──────────────┘   └──────────┼────────────────┘│
└─────────────────────────────────┼────────────────┘
                                  │ HTTPS
                                  ▼
                    ┌──────────────────────┐
                    │ Google Gemini 2.0    │
                    │ Flash API            │
                    └──────────────────────┘
```

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** ≥ 18.x — [Download](https://nodejs.org/)
- **npm** ≥ 9.x (comes with Node.js)
- **Git** — [Download](https://git-scm.com/)

And the following accounts:

- **Supabase** account — [supabase.com](https://supabase.com) (free tier works)
- **Google AI Studio** API key — [aistudio.google.com](https://aistudio.google.com) (free tier works)

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/BuildWise.git
cd BuildWise/buildwise-dashboard
```

### 2. Install Dependencies

```bash
npm install
```

This installs React, Vite, Tailwind CSS, GSAP, Lucide, and `@supabase/supabase-js`.

---

## Environment Setup

### 3. Create Environment File

Create a `.env.local` file in the `buildwise-dashboard/` directory:

```bash
# buildwise-dashboard/.env.local

VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> **Where to find these values:**
> 1. Go to [supabase.com](https://supabase.com) → your project
> 2. Navigate to **Project Settings → API**
> 3. Copy the **Project URL** and **anon (public)** key

> ⚠️ `.env.local` is already in `.gitignore` — it will never be committed.

---

## Supabase Configuration

### 4. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **New Project**
3. Choose a name (e.g., `BuildWise`), select a region close to your users (e.g., `ap-south-1` for India)
4. Wait ~2 minutes for the project to initialize

### 5. Run Database Migrations

The database schema needs to be applied. You can do this via the **Supabase SQL Editor** (Dashboard → SQL Editor) or via the Supabase CLI.

The migrations create:
- 8 tables: `organizations`, `profiles`, `projects`, `phases`, `tasks`, `site_logs`, `materials`, `client_projects`
- Row Level Security policies for all 3 roles
- Auto-update timestamps triggers
- Auto-create profile on signup trigger
- 15 performance indexes

> If you're setting up from scratch, the migration SQL files are in the Supabase migration history (accessible via the MCP or Supabase Dashboard → Database → Migrations).

### 6. Seed the Materials Library

The DSR (Delhi Schedule of Rates) materials library contains 96 items across 10 categories:

| Category | Items | Examples |
|----------|-------|---------|
| Earthwork | 7 | Excavation, filling, anti-termite |
| Concrete | 10 | PCC M10-M15, RCC M20-M35, Ready Mix |
| Steel | 8 | TMT Fe415/Fe500/Fe500D, structural, wire |
| Masonry | 8 | Brick, AAC block, fly ash, stone rubble |
| Formwork | 6 | Steel, plywood, MIVAN system |
| Plastering | 6 | Cement, gypsum, waterproof |
| Flooring | 8 | Vitrified, granite, marble, laminate |
| Painting | 7 | Putty, primer, emulsion, enamel |
| Plumbing | 9 | CPVC, SWR, GI pipe, sanitary fittings |
| Electrical | 10 | Conduit, wire, switches, MCB, earthing |

### 7. Set the Gemini API Key Secret

The AI Edge Functions need a Gemini API key stored as a server-side secret (never exposed to the browser).

**Option A — Supabase Dashboard:**
1. Go to **Edge Functions → Manage Secrets**
2. Add: `GEMINI_API_KEY` = `your-gemini-api-key`

**Option B — Supabase CLI:**
```bash
npx supabase secrets set GEMINI_API_KEY=your-gemini-api-key --project-ref your-project-id
```

### 8. Disable Email Confirmation (Development)

For local development, disable email verification so signups work instantly:

1. Go to **Authentication → Providers → Email**
2. Toggle OFF **"Confirm email"**

> ⚠️ Re-enable this before going to production.

---

## Running the Application

### Development Server

```bash
cd buildwise-dashboard
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

The production bundle is output to `dist/`.

---

## User Roles & Permissions

BuildWise has 3 user roles, each with different access levels enforced at the **database level** via Row Level Security.

### Admin (Supervisors, Architects, Project Managers)

| Module | Access |
|--------|--------|
| Project Overview | ✅ Full KPIs, alerts, activity feed |
| Timeline / Gantt | ✅ Full view + AI Schedule Generation |
| Site Logs | ✅ Read all logs + submit + AI summarize |
| Materials / DSR | ✅ Full CRUD |
| Cost Estimation | ✅ Trigger AI estimates |
| Settings | ✅ Full access |

### Worker (Site Engineers, Construction Crew)

| Module | Access |
|--------|--------|
| Site Logs | ✅ Submit own logs + view own history |
| Project Overview | ❌ Not visible |
| Timeline / Gantt | ❌ Not visible |
| Materials / DSR | ❌ Not visible |

### Client (Project Owners)

| Module | Access |
|--------|--------|
| Project Overview | ✅ Read-only project progress |
| Timeline / Gantt | ❌ Not visible |
| Site Logs | ❌ Not visible |
| Materials / DSR | ❌ Not visible |

All permissions are enforced at the database level. Even if someone bypasses the UI, Supabase RLS policies prevent unauthorized data access.

---

## Core Modules

### Project Overview

The main dashboard showing:
- **KPI Cards** — Active projects, tasks due today, blocked tasks, budget status, latest site log
- **Alerts Panel** — Blocked tasks, missing cost estimates, overdue items
- **Recent Activity** — Timeline of recent site log submissions and system events

### Timeline / Gantt

Visual project timeline with:
- Phases rendered as groups with tasks inside
- Task bars positioned by **real start/end dates** (not hardcoded positions)
- Color-coded status: green (done), blue (in progress), gray (todo), red (blocked)
- Click any task → detail drawer with status, dates, cost, dependencies, AI insights
- **"AI Generate Schedule"** button (Admin only) — opens a modal to describe a project and generate a full schedule

### Site Logs (Field Reporting)

Two-panel interface:
- **Left: Capture Panel** — Shows today's active tasks, text input for field notes, submit button
- **Right: AI Summary** — After submission, displays structured analysis: Progress, Blockers & Delays, Next Steps
- Recent logs history below the summary

### Materials Library (DSR)

Searchable, filterable table of the Delhi Schedule of Rates:
- Search by item code or description
- Filter by category dropdown
- Columns: Code, Description, Category, Unit, Base Rate (₹)

---

## AI Workflows

### Schedule Generation

**Trigger:** Admin clicks "AI Generate Schedule" in the Gantt view.

**Flow:**
1. Admin provides: project description, location (optional), duration in weeks (optional)
2. Edge Function sends to **Gemini 2.0 Flash** with a structured prompt
3. AI returns JSON: phases array → each with tasks, durations, dependencies
4. System performs **atomic batch insert** — all phases and tasks in one operation
5. If any insert fails, the entire operation **rolls back** (no partial schedules)
6. Dates are calculated sequentially from today

### Site Log Summarization

**Trigger:** Worker or Admin submits a site log.

**Flow:**
1. User types raw field notes (or voice-to-text transcription)
2. Edge Function sends to Gemini with extraction prompt
3. AI returns structured JSON: `{ progress, blockers, next_steps }`
4. Response is validated (all 3 fields must be present)
5. Raw text + AI summary saved to `site_logs` table
6. Summary displayed in the UI immediately

### Cost Estimation

**Trigger:** Admin clicks "AI Estimate Cost" on a task in the Gantt drawer.

**Flow:**
1. Edge Function fetches the task details + entire materials library from DB
2. Sends to Gemini with DSR context and task description
3. AI returns: line items (material code, quantity, unit, rate, amount), labor cost, overhead %, total
4. Cost breakdown stored in `tasks.cost_breakdown` (JSONB) and `tasks.estimated_cost` (numeric)
5. Displayed inline in the task drawer

---

## Database Schema

```
organizations       profiles            projects
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ id (PK)      │◄──│ org_id (FK)  │   │ id (PK)      │
│ name         │   │ id (PK/FK)   │   │ org_id (FK)  │──►organizations
│ slug         │   │ full_name    │   │ name         │
│ description  │   │ role (enum)  │   │ status       │
│ created_at   │   │ avatar_url   │   │ budget       │
│ updated_at   │   │ phone        │   │ start/end    │
└──────────────┘   └──────────────┘   └──────────────┘
                                              │
                   ┌──────────────────────────┤
                   ▼                          ▼
            ┌──────────────┐          ┌──────────────┐
            │ phases       │          │ site_logs    │
            │ id (PK)      │          │ id (PK)      │
            │ project_id   │          │ project_id   │
            │ name         │          │ submitted_by │
            │ order_index  │          │ raw_text     │
            │ start/end    │          │ ai_summary   │
            └──────┬───────┘          │ log_date     │
                   │                  │ flagged      │
                   ▼                  └──────────────┘
            ┌──────────────┐
            │ tasks        │     ┌──────────────┐
            │ id (PK)      │     │ materials    │
            │ phase_id     │     │ id (PK)      │
            │ project_id   │     │ item_code    │
            │ name         │     │ description  │
            │ status       │     │ unit         │
            │ progress     │     │ base_rate    │
            │ dependencies │     │ category     │
            │ est_cost     │     └──────────────┘
            │ cost_brkdown │
            │ start/end    │     ┌──────────────┐
            └──────────────┘     │client_projects│
                                 │ client_id    │
                                 │ project_id   │
                                 └──────────────┘
```

**Roles enum:** `admin`, `worker`, `client`
**Task status enum:** `todo`, `in_progress`, `done`, `blocked`
**Project status enum:** `planning`, `active`, `on_hold`, `completed`

---

## Edge Functions

Three serverless Deno functions deployed on Supabase:

| Function | Endpoint | JWT Required | Method |
|----------|----------|-------------|--------|
| `summarize-log` | `/functions/v1/summarize-log` | ✅ | POST |
| `estimate-cost` | `/functions/v1/estimate-cost` | ✅ | POST |
| `generate-schedule` | `/functions/v1/generate-schedule` | ✅ (Admin only) | POST |

All functions:
- Validate the JWT from the `Authorization` header
- Use the `GEMINI_API_KEY` server-side secret (never exposed to browser)
- Return proper HTTP status codes (400, 401, 403, 404, 500, 502)
- Handle CORS preflight requests
- Parse and validate Gemini AI responses before writing to DB

---

## Materials Library (DSR)

The materials database is seeded with 96 items from the Delhi Schedule of Rates. Categories include:

| Category | Count | Rate Range (₹) |
|----------|-------|----------------|
| Earthwork | 7 | 42 — 3,500 |
| Concrete | 10 | 3,800 — 7,500 |
| Steel | 8 | 35 — 85 |
| Masonry | 8 | 580 — 5,200 |
| Formwork | 6 | 280 — 520 |
| Plastering | 6 | 95 — 245 |
| Flooring | 8 | 380 — 2,800 |
| Painting | 7 | 32 — 180 |
| Doors & Windows | 8 | 95 — 3,200 |
| Plumbing | 9 | 85 — 8,500 |
| Electrical | 10 | 18 — 6,500 |
| Waterproofing | 5 | 120 — 480 |
| Miscellaneous | 8 | 180 — 3,500 |

---

## Theming

BuildWise ships with 4 accessible theme presets. Switch themes using the toggle in the top bar.

| Preset | Description | Font (UI) | Font (Data) |
|--------|-------------|-----------|-------------|
| **Field Daylight** | Clean utility with slate neutrals + safety orange | Inter | IBM Plex Mono |
| **Night Shift** | Low-glare dark with muted accents | Inter | JetBrains Mono |
| **High Contrast** | Maximum accessibility, true B&W + blue accent | Atkinson Hyperlegible | Source Code Pro |
| **Calm Concrete** | Warm grays + signal red | Space Grotesk | Space Mono |

All themes pass WCAG AA contrast requirements and respect `prefers-reduced-motion`.

---

## Project Structure

```
buildwise-dashboard/
├── .env.local              # Supabase credentials (gitignored)
├── index.html              # Entry HTML with Google Fonts
├── package.json            # Dependencies & scripts
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind design tokens
├── postcss.config.js       # PostCSS + Tailwind
├── public/
│   └── vite.svg
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # Auth gate + role-based routing
    ├── App.css             # Fade-in animation
    ├── index.css           # Tailwind base + theme variables + utilities
    ├── contexts/
    │   └── AuthContext.jsx  # Session, profile, role, signIn/signOut
    ├── pages/
    │   └── LoginPage.jsx    # Login/signup with role selector
    ├── components/
    │   ├── Sidebar.jsx      # Role-filtered navigation
    │   ├── TopBar.jsx       # Search, theme toggle, profile, sign out
    │   ├── ThemeToggle.jsx  # 4-preset theme switcher
    │   ├── ProjectOverview.jsx  # KPIs, alerts, activity (live)
    │   ├── GanttTimeline.jsx    # Timeline + AI schedule gen + cost est
    │   ├── FieldLogs.jsx        # Log submission + AI summarization
    │   └── MaterialsLibrary.jsx # DSR table with search/filter
    └── lib/
        ├── supabase.js     # Supabase client singleton
        └── utils.js        # cn() classname merge utility
```

---

## Troubleshooting

### "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY"
- Ensure `.env.local` exists in the `buildwise-dashboard/` directory
- Restart the dev server after creating/modifying `.env.local`

### Login works but dashboard shows "Loading..." forever
- Check that your profile was created: go to Supabase Dashboard → Table Editor → `profiles`
- If empty, the `handle_new_user` trigger may not have fired — check Database → Functions/Triggers

### AI summarization returns 502 error
- Verify `GEMINI_API_KEY` is set in Supabase Edge Functions → Manage Secrets
- Check the Edge Function logs: Dashboard → Edge Functions → `summarize-log` → Logs

### Gantt shows "No schedule yet"
- The Gantt fetches phases + tasks for the selected project
- Either no project exists yet, or no phases/tasks have been created
- Use "AI Generate Schedule" to create one, or seed demo data

### "AI returned invalid format" errors
- Gemini occasionally wraps JSON in markdown code blocks — the Edge Functions strip these automatically
- If persistent, check the Gemini API quota at [aistudio.google.com](https://aistudio.google.com)

### RLS policy errors ("new row violates RLS")
- Ensure the user's profile has `organization_id` set
- Check that the profile `role` matches the action being performed

---

## License

MIT — see [LICENSE](./LICENSE) for details.
