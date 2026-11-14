# Doctor Tracker

Fullstack administrative web application for managing doctors and patients —
**Next.js** frontend + **Express/MongoDB** backend, deployed on **Vercel** with **MongoDB Atlas**.

> Secure admin portal: JWT authentication, CRUD for doctors & patients, an analytics
> dashboard (charts, aggregation pipelines), search/filter/pagination, and a fully
> responsive UI. Verified by 37 backend API checks and 27 frontend E2E browser checks.

## Repository layout

```
Doctor_Tracker/
├── backend/          # Express + Mongoose REST API (JWT auth, CRUD, analytics, seed)
├── frontend/         # Next.js App Router + Tailwind CSS + Recharts admin portal
├── api/index.js      # Vercel serverless entry that mounts the Express app
└── vercel.json       # Vercel project config (frameworks + env var mapping)
```

## Live deployment (Vercel)

| Piece | Where | Notes |
| --- | --- | --- |
| Frontend | Vercel (Next.js) | root `frontend/` |
| API | Vercel (serverless functions) | root `api/index.js` mounts `backend/src/app.js` |
| Database | MongoDB Atlas (free M0 tier) | connection string in `MONGODB_URI` |

See `backend/README.md` and `frontend/README.md` for full local setup, API docs,
architecture notes and the deployment guide.

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
cp .env.example .env      # NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev               # http://localhost:3000
```

## Deploying on Vercel

1. Import this repo on Vercel — the root `vercel.json` handles both pieces:
   - **Frontend project:** root directory `frontend`, framework Next.js.
   - **API project:** root directory `/` — `api/index.js` wraps the Express app as a
     serverless function; requests to `/api/*` are routed to it.
2. Environment variables (API project): `MONGODB_URI` (Atlas), `JWT_SECRET`,
   `JWT_EXPIRES_IN=1d`, `CORS_ORIGIN` (the frontend's `*.vercel.app` URL).
3. Environment variables (frontend project): `NEXT_PUBLIC_API_URL` = API deployment URL.
4. Seed once against Atlas: `cd backend && MONGODB_URI=... npm run seed`.

## Database

**MongoDB Atlas** (cloud) — the free M0 cluster is the standard companion for a Vercel
deployment; both host in the same provider ecosystem, and the serverless API connects
over the SRV connection string. A local MongoDB works for development.

---

© Sakibur Rahman
