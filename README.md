# Doctor Tracker

## Description

Doctor Tracker is a secure administrative portal for a multi-doctor practice: an
authenticated admin manages a registry of doctors and the patients assigned to each of
them, and watches the practice at a glance on an analytics dashboard. A **Next.js 15**
frontend talks to a **standalone Express + MongoDB** REST API — JWT authentication over
every route, server-side search/filter/sort/pagination driven by compound database
indexes, and a dashboard whose numbers are computed by MongoDB aggregation pipelines
rather than in the browser. It is built for the moment a registry stops being a list of
24 rows and becomes tens of thousands.

> Live: frontend <https://doctor-tracker-virid.vercel.app> · API
> <https://doctor-tracker-api-gamma.vercel.app> · Demo login
> `admin@doctortracker.com` / `Admin@123`

---

## Setup guide

### 1. Prerequisites

| Requirement | Notes |
| --- | --- |
| Node.js ≥ 18.17 | Both packages declare `engines` |
| MongoDB | Local `mongod` for development, or a free **MongoDB Atlas M0** cluster |
| npm | Lockfiles are committed; use `npm ci` for reproducible installs |

### 2. Environment files

Both apps ship a committed template. Copy and fill them — **never commit the real ones**
(`.env`, `.env.local` are git-ignored).

```bash
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env.example`

| Variable | Example | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/doctor_tracker` | Database connection |
| `JWT_SECRET` | 32+ random characters | Token signing key (the app refuses placeholders in production) |
| `JWT_EXPIRES_IN` | `1d` | Session lifetime |
| `CORS_ORIGIN` | `http://localhost:3000` | The single allowed browser origin |
| `NODE_ENV` | `development` | Enables the production guards |
| `PORT` | `5000` | API port |

`frontend/.env.example`

| Variable | Example |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000` (or the deployed API origin) |

### 3. Run it

```bash
# API — http://localhost:5000
cd backend
npm ci
npm run seed        # admin account + 24 doctors / ~175 patients of demo data
npm run dev         # node --watch

# Web app — http://localhost:3000
cd ../frontend
npm ci
npm run dev
```

Sign in with the seeded account: **admin@doctortracker.com / Admin@123**.

Useful scripts: `npm run seed:destroy` (wipe the seeded data), `npm run build` (frontend
production build), `npm start` (backend production start).

### 4. Deploy

Two Vercel projects from this one repo — see [Deployment](#deployment).

---

## System architecture

```
┌──────────────────────────────┐        HTTPS / JSON + JWT        ┌───────────────────────────┐
│  Next.js 15 (App Router)     │ ───────────────────────────────▶ │  Express 4 REST API       │
│  React 18 · Tailwind         │ ◀─────────────────────────────── │  helmet · cors · rate     │
│  client components only      │      { success, data, meta }      │  limit · validators       │
│                              │                                   │                           │
│  /login    → JWT to storage  │                                   │  /api/auth                │
│  /dashboard → 6 fetches      │                                   │  /api/doctors             │
│  /doctors   → list + filters │                                   │  /api/patients            │
│  /doctors/:id → profile+list │                                   │  /api/analytics           │
│  /patients  → list + filters │                                   │                           │
└──────────────────────────────┘                                   └────────────┬──────────────┘
        ▲                                                                      │ Mongoose
        │  Bearer token on every request                                       ▼
        │                                                          ┌───────────────────────────┐
   localStorage['dt_token']                                        │  MongoDB                  │
                                                                   │  admins · doctors ·       │
                                                                   │  patients (1:N)           │
                                                                   │  compound + text indexes  │
                                                                   └───────────────────────────┘
```

**Request lifecycle.** A page renders, `useApi` issues one `fetch` with
`Authorization: Bearer <jwt>`; Express runs `protect` (verify JWT → load admin), then the
route handler validates input with `express-validator`, builds a **whitelisted** Mongo
filter, and runs `countDocuments` + `find().sort().skip().limit()` in parallel. The reply
is always `{ success, data, meta }`, so list pages get their pagination envelope from the
same response as their rows. Mutations return the created/updated document; the client
refetches the affected query instead of guessing the new state.

**Why two apps instead of Next API routes.** The brief requires a standalone Express
server and a separate client. Splitting them also keeps the token boundary honest: the
browser only ever holds a JWT, never a database credential, and the API can be scaled,
rate-limited and deployed independently (it runs as a single Vercel serverless function).

**Dashboard data flow.** `/dashboard` fans out to `analytics/overview` (totals,
specializations, caseloads), `analytics/conditions` (condition mix), `analytics/daily`
(180 days of admissions), `doctors` (the visible, filtered page), `patients` (recent
records for the month strips) and `doctors/:id/stats` (the selected doctor's six-month
trend). Every one of those is an aggregation or an indexed query — the browser never
receives a full collection to count.

---

## Technical decisions

### 1. Filtering, sorting and pagination belong to the server, not the table

The tempting shortcut for a 24-row demo is to fetch every doctor once and filter with
`Array.filter` in the browser. It reads well and it is wrong the moment the register
grows: the payload grows with the collection, `total` becomes "however many the client
happened to load", and the dashboard silently stops finding doctors after row 100.

Instead the query contract is explicit and lives in one place per resource
(`buildDoctorFilter`, `buildPatientFilter`): a **whitelist** of query parameters
(`search`, `specialization`, `hospital`, `status`, `createdFrom`, `createdTo`, `sort`,
`page`, `limit`), a shared `parsePagination` that clamps `limit` to 1–100, and two queries
per request (`countDocuments` + a page of documents) instead of a `$facet` stage. Search
terms are regex-escaped, so user input can never become a pattern gadget.

Each filter combination the UI offers is backed by a compound index that puts the filter
field first and `createdAt` second (`{ specialization: 1, createdAt: -1 }`,
`{ status: 1, createdAt: -1 }`, `{ doctor: 1, createdAt: -1 }`, …), so the sort is served
by the index rather than a blocking in-memory `SORT`. The dashboard therefore asks
`/api/doctors?search=…&specialization=…&status=…&sort=…&limit=50` and reports
`meta.total` — the same numbers the list page shows.

**Cost:** the UI cannot instant-flip between filters without a round trip; the search box
is debounced (350 ms) and results are not optimistically filtered, which is the right
trade for a registry that has to stay correct.

### 2. URL as the state store, plus a 40-line `useApi` hook — no Redux, no React Query

List state (page, limit, search, every filter, sort) is *already* a shareable description
of what the user is looking at, so it is stored where it belongs: the URL. `/doctors?specialization=Cardiology&page=2`
survives a refresh, is restored by the back button, and can be pasted into a chat. A
`setParam` helper writes the patch and drops `page` whenever a filter changes, which
removes a whole class of "page 3 of 1 result" bugs.

Data fetching is a single hook (`lib/useApi.js`) built on `useState` + `useEffect`:

* the dependency key is `JSON.stringify(params)`, so a request fires only when the query
  actually changes — no request per render, no re-render loop;
* every new request aborts the previous one with `AbortController`, so a slow response
  can never overwrite a newer one (the classic out-of-order search bug);
* it returns `{ data, meta, loading, error, refetch }`, and `refetch` is stable, which is
  what the modals call after a mutation.

Redux would add a store, actions and selectors for state that is already addressable in
the URL; React Query would add a cache with staleness policies for screens whose data is
edited by the same user who is looking at it. Neither earns its weight here.

**Cost:** no cross-page cache — navigating from `/doctors` to `/doctors/:id` refetches the
doctor. That is one small indexed request, and it guarantees the detail view never shows a
stale record after an edit. `useApi` also does not retry; failures surface through the
shared `ErrorState` with an explicit "Try again", which is deliberate for an admin tool
where a silent retry can mask a real outage.

### 3. Small supporting decisions

* **JWT in `localStorage`** (not a cookie) because the API is a different origin in
  production; the trade-off is XSS exposure, mitigated by never rendering untrusted HTML.
  A CSP and httpOnly cookie session are the next hardening step.
* **`passwordHash` is `select: false`**, so it cannot leak through a generic `find()`.
* **Whitelisted updates** — `PUT /doctors/:id` copies named fields instead of spreading
  `req.body`, so a client can never write `_id`, timestamps or future schema fields.
* **Charts use Recharts**; the rest of the motion is `motion/react`. Both are client
  components only, so the initial HTML stays small.

---

## Features

**Authentication** — JWT login (rate-limited to 20 attempts / 15 min / IP), protected
routes on the client (`<Protected>`) and the server (`protect`), session restore from
`/api/auth/me`, sign-out, identical error for unknown email and wrong password.

**Doctors** — create / edit / delete (cascading their patients), search by name,
specialization, hospital or email, filter by specialization, hospital, status and
registration date range, sort, paginate, view a doctor's patients, add a patient under a
doctor.

**Patients** — create / edit / delete, search by name or notes, filter by condition,
status, assigned doctor and registration range, sort (newest, oldest, name, age),
paginate.

**Dashboard** — totals (doctors, active, patients), average caseload, three compact
breakdowns (top specializations, patients by status, busiest doctors), "needs attention"
condition tiles that
deep-link into the filtered patient list, a searchable/filterable doctor block driven by
the API, and a switchable analytics panel: practice-wide twelve-month admissions chart
(patients **and** doctors) plus a condition-mix donut, or — once a doctor is selected —
that doctor's own six-month chart and condition totals.

**Cross-cutting** — light/dark themes with persisted preference, responsive from 360 px
up, keyboard-reachable controls, skeleton/empty/error states for every data surface, and
a desktop dashboard that fits the viewport without page scroll.

---

## API reference

All routes are under `/api` and require `Authorization: Bearer <token>` except `/auth/login`.
Responses are `{ success, message?, data?, meta? }`.

| Method | Route | Query / body |
| --- | --- | --- |
| POST | `/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | — |
| GET | `/doctors` | `search, specialization, hospital, status, createdFrom, createdTo, sort, page, limit` |
| GET | `/doctors/meta` | distinct specializations + hospitals |
| GET | `/doctors/:id` | — |
| GET | `/doctors/:id/stats` | six-month admissions + condition/status mix |
| GET | `/doctors/:id/patients` | `search, condition, status, page, limit` |
| POST / PUT / DELETE | `/doctors`, `/doctors/:id` | doctor fields (validated) |
| GET | `/patients` | `search, condition, status, doctor, createdFrom, createdTo, sort, page, limit` |
| GET | `/patients/meta` | conditions, statuses, doctor options |
| GET | `/patients/:id` | — |
| POST / PUT / DELETE | `/patients`, `/patients/:id` | patient fields (validated) |
| GET | `/analytics/overview` | totals, by specialization, busiest doctors |
| GET | `/analytics/daily` | `days` (1–90) |
| GET | `/analytics/conditions` | condition distribution |

---

## Database & performance

* `doctors`: `{ specialization, createdAt }`, `{ hospital, createdAt }`, `{ status, createdAt }`,
  `{ createdAt }`, unique `email`, plus a text index on name/specialization/hospital.
* `patients`: `{ doctor, createdAt }`, `{ condition, createdAt }`, `{ status, createdAt }`,
  `{ createdAt }`, text index on name/condition/notes.
* List endpoints run two queries (count + page) and never `$facet`; patient counts for a
  page of doctors come from one grouped aggregation over the returned ids, not a lookup
  per row.
* Dashboard panels are pure aggregation pipelines (`$group`, `$dateToString`, `$lookup`
  for caseloads), so the browser never counts documents.
* Every list endpoint clamps `limit` server-side and derives `skip` from `page`.

---

## Deployment

Deploy as **two Vercel projects** from this one repo:

| Project | Root directory | Env |
| --- | --- | --- |
| `doctor-tracker-api` | `backend/` | `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `NODE_ENV`, `PORT` |
| `doctor-tracker` | `frontend/` | `NEXT_PUBLIC_API_URL` (set before the first build) |

`backend/index.js` exports the Express app for Vercel's zero-config serverless build.
Seed the Atlas database once with `cd backend && MONGODB_URI=<atlas-uri> npm run seed`.

**CI/CD** — `.github/workflows/ci.yml` runs on every push to `main`: the backend job boots
a MongoDB 7 service container, seeds it, starts the API and asserts the auth chain (health
check, 401 without a token, seeded login, authenticated list); the frontend job runs a real
`next build` against the production API URL. Both Vercel projects are linked to `main`, so
a green push is a live deployment.

---

## Visual evidence

Desktop, light theme:

![Dashboard — light](frontend/docs/screenshots/v7-dash-light.png)

Desktop, dark theme:

![Dashboard — dark](frontend/docs/screenshots/v7-dash-dark.png)

Selecting a doctor swaps the panel for their own six-month admissions chart and
condition mix.

![Doctor activity](frontend/docs/screenshots/v7-doctor-panel.png)

Doctor registry:

![Doctors](frontend/docs/screenshots/v4-doctors.png)

Patient registry:

![Patients](frontend/docs/screenshots/v4-patients.png)

Mobile (390 px):

![Dashboard — mobile](frontend/docs/screenshots/v4-mobile-dashboard.png)

---

## Repository layout

```
Doctor_Tracker/
├── backend/                 # Express + Mongoose REST API (deploy root: backend/)
│   ├── index.js             # Vercel serverless entry
│   ├── .env.example
│   └── src/
│       ├── routes/          # auth · doctors · patients · analytics
│       ├── models/          # Admin · Doctor · Patient (+ indexes)
│       ├── middleware/      # protect · asyncHandler · errorHandler
│       ├── utils/           # pagination · sendResponse
│       └── seed.js
└── frontend/                # Next.js App Router client (deploy root: frontend/)
    ├── .env.example
    ├── app/                 # login · dashboard · doctors · doctors/[id] · patients
    ├── components/          # AppShell · Modal · forms · Pagination · charts · ui
    ├── lib/                 # api client · useApi · auth/theme contexts · utils
    └── docs/screenshots/
```

---

© Sakibur Rahman
