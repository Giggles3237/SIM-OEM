# API Reference

Base URL defaults to `http://localhost:3333`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/sim/config` | Retrieve the active simulation config with balancing knobs. |
| POST | `/api/sim/new` | Start a new simulation with the default scenario. Returns the initial snapshot. |
| POST | `/api/sim/tick` | Advance one month using the previously submitted plan. Returns the new snapshot. |
| POST | `/api/actions/plan` | Validate and stage planning inputs for the next tick. |
| GET | `/api/sim/state` | Inspect the current authoritative sim state. |
| GET | `/api/sim/history?from&to` | Fetch historical snapshots in the given window. |
| POST | `/api/save` | Persist the active sim to `UserSave` (stubbed in v1). |
| GET | `/api/save` | List existing saves. |
| POST | `/api/load` | Load a saved game (v1 proxies to `new`). |

Errors follow the shape `{ error: { code, message, details? } }`. POST bodies use the `SimInputPlan` contract defined in `packages/engine`.
