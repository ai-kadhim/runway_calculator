---
name: NextSignal Runway Calculator
description: Next.js + TypeScript startup runway calculator for NextSignal — tracks employees via Deel, Brex expense imports, trips, office costs
type: project
---

NextSignal Runway Calculator is a founder tool to track startup burn rate and cash runway.

**Why:** NextSignal needs to monitor its financial runway across multiple cost centers — payroll through Deel, expenses from Brex, travel, and office costs.

**How to apply:** When working in this repo, know that:
- Payroll is managed through Deel (full-time + contractor contracts with per-employee platform fees)
- Expenses can be uploaded via Brex CSV export
- No health insurance costs (Deel handles benefits)
- Stack: Next.js 15, TypeScript, Tailwind CSS v4, Zustand (persisted to localStorage), Recharts, PapaParse, pnpm, Makefile
- State lives client-side in Zustand with localStorage persistence
