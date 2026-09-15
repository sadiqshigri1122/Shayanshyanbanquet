# Shayan Banquet — Production Deployment Overview

Client-ready summary of the technology stack, hosting needs, and estimated running costs.

---

## 1. Technology Stack

| Area | Technology |
|------|------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS 4, React Router |
| **Backend** | Node.js, Express 5, TypeScript |
| **Database** | SQLite (local demo) — **PostgreSQL required for production** |
| **ORM / validation** | Prisma, Zod |
| **Authentication & security** | Email + password login, role-based access (Office / Manager / Admin), Bearer token sessions, CORS, login rate limiting |
| **Other libraries & services** | Lucide React (icons), date-fns (dates), Vitest (tests). **No external email, SMS, or payment gateway is integrated today.** |

---

## 2. What We Used & Why

| Technology | Purpose |
|------------|---------|
| **React + Vite** | Fast, modern web interface for the public site and staff dashboards. |
| **Tailwind CSS** | Consistent, responsive styling across all pages. |
| **Express API** | Central backend for bookings, payments, approvals, reports, and settings. |
| **Prisma** | Structured database access and data integrity for all business records. |
| **SQLite (current)** | Lightweight database for local development and demos. |
| **PostgreSQL (production)** | Reliable, managed database with backups — required for a live deployment. |
| **Zod** | Validates API requests before data is saved. |
| **Role-based auth** | Ensures Office, Manager, and Admin users only see and change what they are allowed to. |

---

## 3. Production Deployment Requirements

### Hosting

| Component | Requirement |
|-----------|-------------|
| **Backend API** | Node.js web service (always on), bound to port provided by the host |
| **Frontend** | Static site hosting (built with `npm run build`) |
| **Database** | Managed PostgreSQL instance (SQLite is not suitable for cloud production) |

### Domain & SSL

| Item | Requirement |
|------|-------------|
| **Domain** | e.g. `shayanbanquet.com` (or `.pk`) for the public site and staff login |
| **SSL (HTTPS)** | Required — included free with recommended hosting providers |

### Environment variables & secrets

**Frontend (build-time)**

| Variable | Purpose |
|----------|---------|
| `VITE_USE_API` | Set to `true` for live API mode |
| `VITE_API_URL` | Production API URL (e.g. `https://api.yourdomain.com`) |

**Backend (runtime)**

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Set by hosting platform |
| `CORS_ORIGINS` | Allowed frontend URL(s) |
| `DEMO_PASSWORD` | Shared staff password *(replace with per-user passwords before go-live)* |
| `SESSION_TTL_MS` / `REMEMBER_TTL_MS` | Optional session duration settings |
| `NODE_ENV` | Set to `production` |

### Integrations

| Service | Status |
|---------|--------|
| **Email / SMS** | Not built in — event reminders are in-app notifications only |
| **Online payments** | Not built in — payments are recorded manually in the system |
| **File / receipt storage** | Not built in — receipts are generated in the browser |

### Pre-launch engineering (required)

These are small but necessary changes before going live:

1. Switch Prisma from SQLite to PostgreSQL and migrate data.
2. Replace the shared demo password with secure, per-user credentials.
3. Move in-memory sessions to a persistent store (database or Redis) so logins survive server restarts.

---

## 4. Estimated Production Cost

*Approximate USD pricing as of 2026. Actual costs depend on provider, traffic, and storage growth.*

### One-time costs

| Item | Cost | Required? |
|------|------|-----------|
| Domain registration (`.com`) | ~$10–15 / year | **Required** |
| Domain registration (`.pk`) | ~$15–25 / year | **Required** (if using `.pk`) |
| Pre-launch production setup (DB migration, auth hardening) | Development time | **Required** |

### Monthly / yearly costs — **required**

| Item | Estimated cost | Notes |
|------|----------------|-------|
| Backend API (Starter, always on) | ~$7 / month | e.g. Render Starter web service |
| PostgreSQL (Basic 256 MB) | ~$6 / month | Smallest paid tier with no 30-day expiry |
| Frontend static hosting | **$0 / month** | CDN + HTTPS included on Render static sites |
| SSL certificate | **$0** | Included with hosting |
| **Minimum total** | **~$13 / month (~$156 / year)** | Before domain and storage overages |

Additional recurring:

| Item | Cost |
|------|------|
| Domain renewal | ~$10–15 / year (included in yearly total above) |
| Database storage over 1 GB | ~$0.30 / GB / month |

### Optional costs

| Item | Estimated cost | When needed |
|------|----------------|-------------|
| Larger API instance (Standard) | ~$25 / month | Higher traffic or faster response times |
| Larger database (Basic 1 GB) | ~$19 / month | More bookings, customers, and audit history |
| Redis / Key Value cache | ~$10 / month | Persistent sessions at scale |
| Transactional email (e.g. Resend, SendGrid) | ~$0–20 / month | Customer/staff email notifications |
| SMS / WhatsApp API | Usage-based | Automated customer reminders |
| Online payment gateway | Per-transaction fees | If card/mobile payments are added later |
| Managed backups / monitoring add-ons | ~$5–25 / month | Extra peace of mind beyond provider defaults |

---

## 5. Recommended Production Setup

**Render (Hobby workspace)** — professional, reliable, and well-suited to this two-part app (API + static frontend).

| Service | Configuration |
|---------|---------------|
| **Frontend** | Render Static Site — build: `npm run build`, publish: `dist` |
| **Backend** | Render Web Service — build: `npm run build:server`, start: `npm start --prefix server` |
| **Database** | Render PostgreSQL — Basic-256mb to start |
| **Domain** | Custom domain on static site; API on subdomain (e.g. `api.yourdomain.com`) |
| **SSL** | Automatic via Render |

**Why this setup:** Low cost (~$13/month infrastructure), always-on API, free CDN for the frontend, managed PostgreSQL with backups on paid tiers, and straightforward deployment from Git.

**Not recommended for production:** Free-tier API or database (services spin down or expire after 30 days).

---

*This document reflects the current codebase. Optional integrations (email, SMS, online payments) can be added in later phases without changing the core architecture.*
