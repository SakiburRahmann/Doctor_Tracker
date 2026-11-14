# Doctor Tracker

Fullstack administrative web application for managing doctors and patients —
**Next.js** frontend + **Express/MongoDB** backend, deployed on **Vercel** with **MongoDB Atlas**.

> Secure admin portal: JWT authentication, CRUD for doctors & patients, an analytics
> dashboard (charts, aggregation pipelines), search/filter/pagination, and a fully
> responsive UI. Verified by 37 backend API checks and 27 frontend E2E browser checks.

## Repository layout

```
Doctor_Tracker/
├── backend/          # Express + Mongoose REST API (deploy as its own Vercel project)
│   └── index.js      # Vercel entry: exports the Express app (zero-config detection)
└── frontend/         # Next.js App Router + Tailwind + Recharts (separate Vercel project)
```

## Live deployment (Vercel)

Deploy as **two Vercel projects** from this one repo (the task requires a standalone API
and a standalone frontend):

| Project | Root directory | What |
| --- | --- | --- |
| `doctor-tracker-api` | `backend/` | Express API — Vercel auto-detects `index.js`, bundles it into one serverless function; `/api/*` routes work unchanged |
| `doctor-tracker` | `frontend/` | Next.js admin portal |
| Database | — | **MongoDB Atlas** (free M0 cluster) — see below |

1. Import the repo on Vercel twice (root directory `backend/`, then `frontend/`).
2. API env vars: `MONGODB_URI` (Atlas SRV string), `JWT_SECRET` (≥32 chars),
   `JWT_EXPIRES_IN=1d`, `CORS_ORIGIN=https://<frontend>.vercel.app`, `NODE_ENV=production`, `PORT=5000`.
3. Frontend env var: `NEXT_PUBLIC_API_URL=https://<api-project>.vercel.app` (set before first build).
4. Seed once: `cd backend && MONGODB_URI=<atlas-uri> npm run seed`.

See `backend/README.md` and `frontend/README.md` for local setup, API docs, architecture
notes and the full deployment guide.

## Database

**MongoDB Atlas** — the free M0 tier is the standard companion for Vercel: Vercel runs
your app as serverless functions with no local disk, so the database must be a hosted
service, and Atlas is MongoDB's own cloud (same company, SRV connection string, free
forever tier). Create the cluster at <https://cloud.mongodb.com>, add a database user,
allow `0.0.0.0/0` in Network Access (Vercel functions have dynamic IPs), then paste the
SRV string into the API project's `MONGODB_URI` env var.

A local `mongod` works for development only — serverless functions cannot reach your
machine.

## Quick start (local)

```bash
# 1. Database: local MongoDB or an Atlas cluster
# 2. Backend
cd backend && npm install
cp .env.example .env      # set MONGODB_URI, JWT_SECRET, CORS_ORIGIN
npm run seed              # creates admin + demo data
npm run dev               # http://localhost:5000

# 3. Frontend
cd ../frontend && npm install
cp .env.example .env     # NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev              # http://localhost:3000
```

Demo login (created by the seed): `admin@doctortracker.com` / `Admin@123`

---

© Sakibur Rahman
