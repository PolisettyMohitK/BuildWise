# BuildWise — Product Vision & Role Architecture

> This is the long-term reference document for how the app should feel and behave per role. 
> Always consult this before building any role-specific feature.

---

## Core Principle

BuildWise serves **3 fundamentally different users** with **3 fundamentally different interfaces**.
These are NOT just permission-filtered views of the same dashboard.
They are distinct experiences optimized for different contexts, devices, and goals.

---

## Architecture Decision (Confirmed)

**Two-app strategy:**
1. `buildwise-dashboard/` — Web admin panel (React + Vite, desktop-primary, current app)
2. `buildwise-app/` — Mobile app (React Native + Expo, iOS + Android, all 3 roles)

Both apps share the **same Supabase backend** (DB, auth, Edge Functions, RLS, Storage).
Admin panel is built and stabilized first; mobile app is Phase 2.

---

## Role Architecture

### 🔴 Admin (Supervisors, Builders, Architects)
**Context:** Desktop-first (office, site office). Planning and oversight.
**Mindset:** "Control room." Fast scanning, KPIs, dependency tracking, cost oversight.
**Interface:** Dashboard-oriented — dense data, tables, Gantt charts, financial summaries.
**Primary Actions:**
- Create/manage projects, phases, tasks
- Generate AI schedules, cost estimates
- Manage team (invite, assign roles, disable)
- Review site logs and AI summaries
- Link clients to projects
- Monitor alerts, budget variance, blocked tasks

### 🟡 Worker (Construction Workers, Employees) 
**Context:** Mobile-first (99% on phones). On-site, hands dirty, in the sun.
**Mindset:** "Quick capture & guidance." Minimal taps, large touch targets.
**Interface:** Logs-oriented — fast log entry, task status, AI guidance.
**Primary Actions:**
- Submit daily site logs (text + optional voice-to-text)
- View today's assigned tasks + update status
- Get AI-powered guidance for their current tasks
- See safety alerts and material requirements
- Check schedule for their upcoming work

**Design Constraints:**
- Large buttons, minimal scrolling
- Auto-save drafts
- Offline-capable log capture (queue and sync)
- High contrast for outdoor visibility
- Bottom navigation (thumb-reachable)

### 🟢 Client (Flat Owners, Property Buyers, Investors)
**Context:** Mobile-first (99% on phones). Checking from home/office.
**Mindset:** "My flat status." What's happening, when will it be done, talk to someone.
**Interface:** Information-oriented — project progress, flat details, AI Q&A, communication.
**Primary Actions:**
- View their flat/unit progress (which floor, what stage)
- See project timeline with estimated completion
- Ask AI questions about their unit, construction progress, timeline
- Contact supervisors/builders (in-app messaging)
- View photo updates from site (from site logs)
- Get notifications on milestones (floor completed, inspection passed)

**Design Constraints:**
- Clean, reassuring, non-technical language
- Progress bars and visual indicators (not tables)
- Communication channel is PRIMARY feature
- No jargon — translate construction terms to human language
- Bottom navigation (thumb-reachable)

---

## Mobile Optimization Rules (Worker + Client)

1. **No sidebar on mobile** — Use bottom tab navigation
2. **Touch targets minimum 44px**
3. **Single-column layouts only**
4. **Critical actions within thumb zone** (bottom 1/3 of screen)
5. **Pull-to-refresh** for data updates
6. **Skeleton loaders** (not spinners) for content
7. **Swipe gestures** where appropriate (swipe to mark done)
8. **Dark mode default for Worker** (construction site glare)
9. **Light mode default for Client** (professional, reassuring)

---

## Future Features (Reference)

| Feature | Admin | Worker | Client |
|---------|-------|--------|--------|
| Site Photo Uploads | Review | Capture+Upload | View |
| Real-time Subscriptions | All data | Assigned tasks | Linked projects |
| PDF Reports | Generate+Export | N/A | Download |
| In-app Messaging | Hub (receive all) | Send to admin | Send to admin |
| Notifications | Alerts, blockers | Task assignments | Milestones |
| Voice-to-text Logs | N/A | Primary input | N/A |
| AI Q&A | Technical queries | Task guidance | Unit status queries |
| Offline Mode | N/A | Log capture queue | Read-only cache |

---

## Build Priority (Current Phase)

1. ✅ Core CRUD (Projects, Tasks, Team)
2. ✅ AI Functions (Schedule, Cost, Logs)
3. 🔄 Fix core bugs (RLS, Edge Functions)
4. ⬜ Role-specific views (Worker mobile, Client mobile)
5. ⬜ Site log submission for workers
6. ⬜ Client progress view
7. ⬜ In-app messaging
8. ⬜ Photo uploads
9. ⬜ Notifications
10. ⬜ Real-time sync
