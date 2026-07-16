# Nibbo

Nibbo is a family home CRM built with Next.js.  
It combines shared planning tools (tasks, calendar, menu, notes, shopping, budget) with a 3D pet that grows as you complete tasks.

![Login](docs/screenshots/login.png)

## Main Features

- Google sign-in
- Family spaces with member management and invite flow
- Task boards with drag-and-drop
- Calendar, menu planner, notes, shopping list, budget
- Points system for completed tasks
- 3D Nibbo companion (`/dashboard`)
- Private file access scoped to family members

## Stack

- Next.js (App Router) + TypeScript
- Prisma + PostgreSQL (Neon-ready)
- NextAuth
- Local file uploads (`uploads/` or `UPLOAD_DIR`)
- Tailwind CSS

## Local Run

```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

Create `.env` based on `.env.example` and set:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `UPLOAD_DIR` (optional; defaults to `./uploads` under the app root)
- `CRON_SECRET` (for Monobank budget sync: call `POST /api/cron/bank-sync` with `Authorization: Bearer $CRON_SECRET` every hour)

## Monobank sync

Family owners can connect a Monobank personal API token under **Family → Banks**.  
Imported expenses/incomes land in the shared budget; category mapping uses MCC + learned overrides when you edit a Mono expense category.

Schedule an external cron (or Docker/k8s job) every hour:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/bank-sync
```