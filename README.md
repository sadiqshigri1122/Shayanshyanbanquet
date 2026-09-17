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

- **Login:** http://localhost:5173/login
- **Booking office:** http://localhost:5173/office
- **Manager:** http://localhost:5173/manager
- **Admin:** http://localhost:5173/admin
- **API health:** http://localhost:3001/api/health

## Demo walkthrough

| Step | Where | What to try |
|------|--------|-------------|
| 1 | `/office/new-booking` | Create a booking with advance payment |
| 2 | `/office/event-day` | Open today's event (SB-1008) |
| 3 | `/manager/approvals` | Approve SB-1003 discount or pending expense |
| 4 | `/manager/reports` | Print or download CSV report |
| 5 | `/admin/settings` | Update company info or discount threshold |

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
