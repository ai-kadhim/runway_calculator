# Founder Runway Calculator

A startup runway calculator built with Next.js that helps founders track burn rate, revenue, and remaining runway. Integrates with Google Sheets for data persistence and Brex for automatic expense syncing.

## Features

- **Dashboard** — Real-time runway projections with burn rate breakdowns and charts (via Recharts)
- **Revenue tracking** — Log revenue streams with support for monthly, quarterly, annual, and one-time frequencies
- **Employee & Deel management** — Track payroll costs including Deel platform fees by contract type
- **Expense tracking** — Categorized expenses (software, cloud, marketing, legal, etc.) with monthly averages
- **Trip budgeting** — Travel cost tracking with amortization across trip duration
- **Google Sheets sync** — Connect a Google Sheet as a persistent data store
- **Brex integration** — Import card transactions directly from Brex

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts
- **State:** Zustand
- **Package Manager:** pnpm

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Install

```bash
pnpm install
```

### Environment Variables

Copy `.env` and fill in your credentials:

```
GOOGLE_CLIENT_ID=         # Google OAuth 2.0 Client ID
GOOGLE_CLIENT_SECRET=     # Google OAuth 2.0 Client Secret
BREX_API_TOKEN=           # Brex API token (scopes: transactions.card.readonly, accounts.readonly)
```

The Google OAuth redirect URI should be set to `http://localhost:3000/api/auth/google/callback`.

### Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/google/      # Google OAuth flow
│   │   ├── brex/             # Brex sync & status endpoints
│   │   └── sheet/            # Google Sheets read/write
│   ├── layout.tsx
│   └── page.tsx              # Main app with tabbed navigation
├── components/
│   ├── Dashboard.tsx         # Runway metrics & charts
│   ├── BrexConnector.tsx     # Brex account linking
│   ├── SheetConnector.tsx    # Google Sheets linking
│   ├── EmployeeManager.tsx   # Employee/payroll CRUD
│   ├── ExpenseManager.tsx    # Expense CRUD
│   ├── RevenueManager.tsx    # Revenue stream CRUD
│   └── TripManager.tsx       # Travel budget CRUD
├── lib/
│   ├── calculations.ts       # Runway & burn rate math
│   ├── brex.ts               # Brex API client
│   └── google-sheets.ts      # Google Sheets API client
├── store/
│   └── runway-store.ts       # Zustand global state
└── types/
    └── index.ts              # TypeScript interfaces
```

## Available Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start development server |
| `make build` | Production build |
| `make start` | Start production server |
| `make lint` | Run ESLint |
| `make clean` | Remove `.next` and `node_modules` |
| `make install` | Install dependencies |
