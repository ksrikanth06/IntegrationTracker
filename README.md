# Integration Tracker

A Jira-style tracker for the webMethods interface catalog. Built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- **Login screen** — session-based, themed after the Etihad Rail visual identity (navy/UAE red, Barlow display, railway motif on the brand panel)
- **Dashboard** — total/active/inactive counts, per-category breakdown, donut chart of ProjectOps share, filterable & searchable interface list
- **Project details** — full record view, source→target flow diagram, audit info, and related interfaces (same data object)

The 120 records from `Interface_Catalog.xlsx` are converted to `src/data/interfaces.json` (with `ProjectOps` casing and `InterfaceFrequency` variants normalized).

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. Sign in with any non-empty username and password (demo auth — replace `AuthContext.login` with a real API call for production).

## Build

```bash
npm run build
npm run preview
```

## Project structure

```
src/
├── data/interfaces.json          # 120 records, normalized
├── types/index.ts                # Interface & User types
├── lib/utils.ts                  # Category colors, date formatting
├── context/AuthContext.tsx       # Session-based auth
├── components/
│   ├── Layout.tsx                # Top nav for authenticated routes
│   ├── ProtectedRoute.tsx        # Redirect to /login if not authed
│   ├── StatCard.tsx              # KPI card with accent stripe
│   ├── ProjectsPieChart.tsx      # Recharts donut by ProjectOps
│   ├── FilterBar.tsx             # Search + category/priority/freq/status
│   └── InterfaceList.tsx         # Responsive table / mobile list
└── pages/
    ├── Login.tsx
    ├── Dashboard.tsx
    └── ProjectDetails.tsx
```

## Data notes

The source spreadsheet had a few inconsistencies that the converter normalizes:

- `ProjectOps`: `MOBILITY`/`Mobility` → `MOBILITY`
- `InterfaceFrequency`: `Real Time`/`RealTime`/`Realtime` → `Real Time`; `Daily Once`/`DailyOnce` → `Daily Once`

After normalization: **77 MOBILITY · 34 ERP · 9 FREIGHT** (120 total, 102 active).

## Stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3 (custom navy/rail palette, Barlow + Inter via Google Fonts)
- React Router 6
- Recharts (donut chart)
