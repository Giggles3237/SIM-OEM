# Architecture & Design

SimOEM is a pnpm workspace with three core layers:

1. **Simulation Engine (`packages/engine`)** – Pure TypeScript functions implementing the deterministic month-tick loop. It exports typed helpers (`advanceMonth`, demand, warranty, allocation) and the shared type contracts consumed by the API and UI. All randomness is seeded via `seedrandom`.
2. **API (`apps/api`)** – Express server exposing REST endpoints for sim control, state inspection, and persistence. Prisma manages the PostgreSQL/SQLite database. The API orchestrates plans coming from the client, applies Zod validation, invokes the engine, and stores snapshots.
3. **Web (`apps/web`)** – Vite + React front-end with TanStack Router/Query, Zustand for local planning drafts, and Recharts for visualization. The UI surfaces KPIs, plan editors, and history charts. In development builds, the debug panel (future enhancement) can tweak coefficients at runtime.

Shared UI primitives live in `packages/ui-kit`. Database schema and seeds reside in `/prisma`. Scenario definitions are JSON packs in `/scenarios` that the API can apply when starting a new game.

![Flow](https://mermaid.ink/img/pako:eNp9kM1qwzAMhl9lzrJZtwgbtIt0EAoF8QFcuqHjqFucqpuoP12TLOMJf5-r9ji3mZxvIu_HO8CiAqQEd4lpPZG0AXXPpUqkgW0C0I8ru-8Q4cqHWSZGq8X2v1E-Lb8yY1ewh0mA_0-fz-6SCEQSppTQFPZWRx2AxYcK6r4hAkHLr4Hh6s5jVn2MeBGslpyVKyU6_HIYIBhTLD1sJ-ySyJcVn4O4W6tN4M1Jo9ZwAMInAYc2pR2wMBpFrRbX7UAnT_fzIjjUyDxk9S1C4dDJ71o2Tz6f83zq-dPn8ftxzt0kP-ZWC1ZjC9nblncyeYFjBvBQCmB4p2qu14U-n1Uue3sP7o4fJPAo)

## Tick Flow

The server calls `advanceMonth(prevState, plan, cfg, seed)` which internally executes the loop defined in the spec. The engine returns the updated state and a `SimSnapshot` containing KPIs, production/sales deltas, and messaging for the UI.

## Persistence

- `SimConfig` contains tunable coefficients used by the engine.
- `SimState` stores the authoritative finance and macro-level data, while `SimSnapshot` provides history for charts.
- `seed.ts` populates markets, trims, plants, suppliers, and tech tree nodes for a playable baseline scenario.

## Front-End Data Flow

The UI uses React Query to fetch config, state, and history. Planning inputs are staged in Zustand until the user submits. Upon submission, the plan is posted to `/api/actions/plan`. Clicking “Advance Month” invokes `/api/sim/tick`, which causes the API to invoke the engine and broadcast the next snapshot.

