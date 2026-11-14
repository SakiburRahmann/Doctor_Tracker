# Doctor Tracker — Admin Portal (Frontend)

> A modern, responsive Next.js admin application for managing doctors and their patients: JWT-secured login, a chart-driven analytics dashboard, and fully searchable / filterable / paginated doctor & patient registries — built with **Next.js 14 (App Router), Tailwind CSS and Recharts**.

This is the standalone frontend half of a two-repo project. The Express + MongoDB API lives in its own repository ([`doctor-tracker-backend`](../backend)) and is consumed over REST.

---

## Table of Contents

1. [Description](#description)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Setup Guide](#setup-guide)
5. [System Architecture](#system-architecture)
6. [Technical Decisions](#technical-decisions)
7. [Visual Evidence](#visual-evidence)
8. [Performance Notes](#performance-notes)
9. [Project Structure](#project-structure)
10. [Deployment](#deployment)

---

## Description

The portal is the single screen estate for an administrator running a healthcare practice: after signing in, the admin lands on a dashboard whose stat cards and four visualizations (14/7/30-day registration trend, patients-per-doctor ranking, condition distribution donut, specialization breakdown) are aggregated server-side in MongoDB. From there, persistent navigation moves between the Doctors registry (create, search, filter by specialization/hospital/status/date, paginate, drill into any doctor's own patient list, add or remove patients under them) and the dedicated Patients page (search, filter by condition/status/assigned doctor/date, edit, delete) — all state kept in the URL so any filtered view can be shared, refreshed, or reached with the back button.

## Features

- **Authentication** — split-screen login with inline validation, error surfacing, show/hide password; the session resolves *before* protected routes render (no content flash); logout clears the token and guards every route.
- **Dashboard** — 4 stat cards (total doctors, total patients, avg patients/doctor, critical count), area chart of daily registrations with a 7/14/30-day range switch, top-10 patients-per-doctor bar chart, condition donut, specialization bars.
- **Doctors** — table with search (debounced), specialization/hospital/status/date-range filters, sort, windowed pagination with page-size select; row actions: view detail, edit, delete (with confirmation dialog warning about the patient cascade); "+ Add doctor" modal with per-field errors mirrored from the API.
- **Doctor detail** — profile card, the doctor's own paginated patient list with search + condition filter, add patient directly under this doctor, delete patient.
- **Patients** — dedicated page with search, condition/status/doctor/date-range filters, four sort orders, pagination, edit modal, delete confirmation.
- **UX** — responsive from 390 px up (sidebar collapses to a hamburger drawer), skeleton loaders, empty and error states with retry on every data view, accessible modals (Esc to close, focus management, aria labels), icon buttons with tooltips.

## Tech Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 14 (App Router) | Spec requirement; file-based routing + layouts fit a 3-section portal |
| Styling | Tailwind CSS 3 | Utility-first keeps styling colocated; small `@layer components` for buttons/inputs/badges |
| Charts | Recharts | React-native SVG charts, responsive containers, declarative config |
| State | React Context + hooks (no Redux) | See [Technical Decisions](#technical-decisions) |
| Data fetching | Custom `useApi` hook | Abortable, param-keyed, single fetch wrapper with token injection |

## Setup Guide

### Prerequisites

- Node.js ≥ 18.17
- The Doctor Tracker backend running locally (see its README) on `http://localhost:5000`

### Steps

```bash
# 1. Clone and install
git clone <your-frontend-repo-url> doctor-tracker-frontend
cd doctor-tracker-frontend
npm install

# 2. Configure environment
cp .env.example .env.local
#    NEXT_PUBLIC_API_URL=http://localhost:5000   (or your deployed API URL)

# 3. Run the dev server
npm run dev          # http://localhost:3000

# 4. Production build
npm run build && npm start
```

Log in with the backend's seeded credentials:

```
email:    admin@doctortracker.com
password: Admin@123
```

### Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | yes | Base URL of the backend API, no trailing slash |

## System Architecture

```
Browser
  │
  ▼
Next.js App Router (this repo)
  │
  ├─ app/layout.js            → AuthProvider wraps every route
  ├─ app/login/               → public route: login form
  ├─ app/dashboard/           → Protected: analytics + charts
  ├─ app/doctors/             → Protected: registry + filters
  ├─ app/doctors/[id]/        → Protected: one doctor + their patients
  ├─ app/patients/            → Protected: dedicated patient page
  │
  ├─ lib/auth-context.js      → session state machine (loading → auth/unauth)
  ├─ lib/api.js               → fetch wrapper: token injection, ApiError, timeouts
  ├─ lib/useApi.js            → data hook: param-keyed refetch + abort
  └─ components/              → AppShell, Protected, Pagination, Modal,
                                DoctorFormModal, PatientFormModal, ui primitives
  │
  │  REST (JSON) — Authorization: Bearer <JWT>
  ▼
Express API  ──►  MongoDB (Atlas)
```

Data flow for a typical list view:

1. The page reads its state from **URL search params** (`page`, `search`, `condition`, …).
2. `useApi('/api/doctors', params)` serializes the params into a dependency key — any change triggers exactly one request and aborts the previous one.
3. `lib/api.js` attaches the JWT from `localStorage`, parses the `{ success, data, meta }` envelope, and throws a normalized `ApiError` on failure.
4. The component renders through three states (loading skeleton / error with retry / data + pagination bar from `meta`).
5. Mutations (create/edit/delete) call the API directly, then `refetch()` the active query and close the modal.

## Technical Decisions

### Decision 1 — Context + `useApi` hooks instead of Redux

The spec calls for "proper state management", which usually triggers a reflexive `npm i redux`. This app has exactly **one** piece of global client state: the session (user + token). Everything else is *server* data, and server data has a natural home already — the URL and the cache.

- `AuthContext` holds the session: a three-state machine (`loading → authenticated | unauthenticated`) that gates rendering in `Protected`, provides `login`/`logout`, and resolves the stored token via `GET /api/auth/me` on boot. One context, zero selectors, no provider tree nesting.
- `useApi(path, params)` handles all server state. It is param-keyed (change a filter → one new request), abortable (in-flight responses can't overwrite newer ones), and exposes `refetch` for refresh-after-mutation. That is 90% of what React Query gives you, in ~60 lines with no dependency.
- Redux would add a store, action types, thunks for every endpoint, and cache-invalidation logic — while still needing the URL to be the source of truth for shareable filtered views. For a 5-route CRUD portal that is pure ceremony. The architecture documents *where* a store would earn its keep: if doctors/patients ever needed optimistic cross-page updates or offline writes, swapping `useApi` for React Query is a contained change behind the same interface.

### Decision 2 — URL search params as the state container for list views

Filters, search text, sort order, and page number live in `useSearchParams()`, not `useState`. Every user action writes a param via `router.replace` (see `setParam` in both list pages).

- **Shareability & deep-linking:** `/patients?condition=Critical&status=admitted&page=2` is a permanent link to exactly that view — invaluable for support tickets and interview walkthroughs.
- **Refresh & back-button safety:** a refresh restores the identical view; browser back steps through filter history for free. Local state loses all of this.
- **One request per interaction:** because `useApi`'s dependency key is the serialized params, a filter change produces precisely one API call; the debounce (350 ms) collapses typing bursts into one more.
- **No sync bugs:** there is a single source of truth. The search input's `defaultValue` comes from the URL; the table, the pagination bar, and the "clear all filters" link all read the same params, so they can never disagree.

The trade-off is a little `router.replace` ceremony; a tiny `setParam(patch)` helper in each page absorbs it.

## Visual Evidence

High-resolution screenshots of the running app (seeded data, 1440×900 desktop and 390×844 mobile). The same set ships in `docs/screenshots/` inside this repo.

### Desktop

| View | What it shows |
| --- | --- |
| `01-login.png` | Split-screen login — brand panel with demo credentials card |
| `02-dashboard.png` | Stat cards, daily-registrations area chart, condition donut, patients-per-doctor bars, specialization breakdown |
| `03-doctors.png` | Doctor registry — table, filter bar, pagination |
| `04-doctors-search.png` | Live search narrowing the registry ("cardio") |
| `05-doctors-filter.png` | Specialization filter applied |
| `06-doctor-detail.png` | Doctor profile + their patient list |
| `07-add-patient-modal.png` | Add-patient form modal with validation |
| `08-doctor-detail-after-crud.png` | Registry after add/delete round-trip |
| `09-patients.png` | Dedicated Patients page — global table with all filters |
| `10-patients-filter.png` | Condition filter (Critical) applied |
| `11-edit-patient-modal.png` | Edit-patient modal |

### Mobile

| View | What it shows |
| --- | --- |
| `12-dashboard-mobile.png` | Stacked stat cards + charts at 390 px |
| `13-doctors-mobile.png` | Doctors table with priority columns |
| `14-mobile-drawer.png` | Hamburger navigation drawer open |

Every screenshot above was captured by an automated end-to-end run (`scripts/verify-frontend.js`) that logs in through the real UI, performs create/edit/delete actions, applies filters, and logs out — 27 checks green.

## Performance Notes

- **Avoid unnecessary re-renders** — list state is URL-derived, so typing in search does not re-render the table until the debounced param changes; `useApi` aborts superseded requests; `useMemo`/`useCallback` pin filter objects and handlers.
- **One request per interaction** — param-keyed fetching + 350 ms search debounce; filter dropdown options come from tiny `distinct()` endpoints, not the collection.
- **Client bundle discipline** — Recharts is imported only by the dashboard route (code-split by the App Router); the dashboard page is the only heavy route (112 kB) while doctors/patients pages stay ~108 kB first load.
- **Perceived speed** — skeletons on every table, charts animate in, modals open instantly (no fetch on open), delete confirmations are inline dialogs.

## Project Structure

```
frontend/
├── app/
│   ├── layout.js               # RootLayout + AuthProvider
│   ├── page.js                 # "/" → session-aware redirect
│   ├── login/page.js           # Public login
│   ├── dashboard/page.js       # Analytics + charts
│   ├── doctors/page.js         # Registry (search/filter/paginate/CRUD)
│   ├── doctors/[id]/page.js    # Doctor detail + nested patient management
│   ├── patients/page.js        # Dedicated patient page (edit/delete)
│   └── globals.css             # Tailwind + component classes
├── components/
│   ├── AppShell.js             # Sidebar + mobile drawer + top bar
│   ├── Protected.js            # Route guard (redirect + splash)
│   ├── Pagination.js           # Windowed pager + page-size select
│   ├── Modal.js                # Accessible dialog shell
│   ├── DoctorFormModal.js      # Create/Edit doctor form
│   ├── PatientFormModal.js     # Create/Edit patient form
│   └── ui.js                   # StatCard, PageHeader, Loading/Empty/Error states
├── lib/
│   ├── api.js                  # fetch wrapper + ApiError + token storage
│   ├── auth-context.js         # AuthProvider / useAuth
│   ├── useApi.js               # Param-keyed data hook
│   └── utils.js                # date/badge helpers + debounce
├── jsconfig.json               # @/ path alias
├── next.config.js
├── tailwind.config.js
└── .env.example
```

## Deployment

### Vercel (Free Tier)

1. Push this repo to GitHub.
2. Vercel → **Add New → Project** → import the repo (framework auto-detects as Next.js).
3. Environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://<your-backend>.onrender.com` (your deployed API URL)
4. Deploy. Vercel runs `next build` and serves the app on a `*.vercel.app` domain.
5. Remember to add the Vercel URL to the backend's `CORS_ORIGIN` env var.

> `NEXT_PUBLIC_*` variables are inlined at build time — set the env var in Vercel *before* the first build (a rebuild re-inlines it).

### Netlify (alternative)

Install `@netlify/plugin-nextjs` and deploy with build command `npm run build`; the env var setup is identical.

---

### Verification

```bash
node scripts/verify-frontend.js   # from the project root (backend deps installed)
# ===== FRONTEND E2E RESULT: 27 passed, 0 failed =====
```

The run boots an in-memory MongoDB, the API, and the built frontend, then drives a real headless browser through: login (invalid + valid), dashboard charts, doctor search/filter, doctor detail, add + delete patient under a doctor, patient page search/filter/edit, mobile viewport + drawer, logout, and the post-logout route guard — capturing the screenshots in `Visual Evidence` along the way.
