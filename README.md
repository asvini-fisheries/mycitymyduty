# MyCityMyDuty

Civic engagement platform for managing corporations, geographic hierarchy (zones → wards → areas → streets), stakeholders, projects, activities, daily work updates, billing, and payments.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4**
- **Supabase** (PostgreSQL, Auth, RLS)

## Modules

| Section | Features |
|---------|----------|
| Geography Masters | Corporations, Zones, Zone-wise Wards, Ward-wise Areas, Area-wise Streets |
| Officials & Services | Corporation Officials, Service Categories |
| Stakeholders | Categories, Access Rights, Stakeholders, Members, Equipment, Central Committee |
| Projects & Activities | Projects, Activities, Project Activities, Resource Requirements, Executors, Funders |
| Operations | Daily Activity Updates, Resources Used, Bills, Payments |
| Dashboard | Overview stats + Project-wise dashboard |

## Setup

1. **Install dependencies**

   ```bash
   cd mycitymyduty-application
   npm install
   ```

2. **Configure Supabase**

   - Create a project at [supabase.com](https://supabase.com)
   - Copy `.env.example` to `.env.local` and add your URL and anon key
   - Run `supabase/migrations/001_initial_schema.sql` in the SQL Editor
   - Run `supabase/migrations/002_signup_trigger_fix.sql` if needed

3. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), create an admin account on first visit.

## Project structure

```
mycitymyduty-application/
├── src/
│   ├── app/dashboard/          # Dashboard + all master/operation pages
│   ├── components/crud/        # Reusable CRUD with Excel import/export
│   ├── components/layout/        # Sidebar, shell
│   ├── lib/crud-configs.ts     # Field/column config per table
│   └── lib/navigation.ts       # Sidebar navigation
└── supabase/migrations/        # Database schema
```

## Excel import/export

Every master and transaction screen supports Excel template download, bulk upload, and filtered export via the toolbar on each page.
