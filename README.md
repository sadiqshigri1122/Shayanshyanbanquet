# Shayan Banquet & Lawn Management System

Local demo prototype for banquet booking, payments, event-day operations, manager approvals, and business reports.

## Quick start

```bash
# 1. Install dependencies (root + server)
npm install
npm install --prefix server

# 2. Set up SQLite database with seed data
npm run db:setup

# 3. Start frontend + backend together
npm run dev:all
```

- **Public site:** http://localhost:5173/
- **Booking office:** http://localhost:5173/office
- **Manager:** http://localhost:5173/manager
- **Admin:** http://localhost:5173/admin
- **API health:** http://localhost:3001/api/health

## Demo walkthrough

| Step | Where | What to try |
|------|--------|-------------|
| 1 | `/inquiry` | Submit a booking inquiry |
| 2 | `/booking-status?ref=SB-1001` | Look up booking status |
| 3 | `/office/new-booking` | Create a booking with advance payment |
| 4 | `/office/event-day` | Open today's event (SB-1008) |
| 5 | `/manager/approvals` | Approve SB-1003 discount or pending expense |
| 6 | `/manager/reports` | Print or download CSV report |
| 7 | `/admin/settings` | Update company info or discount threshold |

**Sample bookings:** SB-1001 (partial payment), SB-1003 (discount approval), SB-1007 (inquiry), SB-1008 (today's event)

Use the **Demo quick-login buttons** on the login page to sign in as Office, Manager, or Admin (password: `shayan123`).

## Configuration

Copy `.env.example` to `.env`:

```env
VITE_USE_API=true
VITE_API_URL=
```

With `VITE_USE_API=true`, the frontend uses the Express API via Vite proxy (`/api` → `:3001`). Set to `false` for localStorage-only demo mode (no backend required).

Server config in `server/.env`:

```env
DATABASE_URL="file:./dev.db"
PORT=3001
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:all` | Start API + frontend (recommended) |
| `npm run dev` | Frontend only |
| `npm run dev:server` | Backend only |
| `npm run db:setup` | Install server deps, push schema, seed DB |
| `npm test` | Run unit tests |
| `npm run build` | Production build |

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router
- **Backend:** Express 5, Prisma, SQLite, Zod validation
