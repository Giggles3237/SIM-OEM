# Installation

1. Install [pnpm](https://pnpm.io/installation) and ensure Docker is available for the database container.
2. Copy `.env.example` to `.env` in the repository root if you need to override defaults.
3. Install dependencies and generate the Prisma client:

```bash
pnpm install
pnpm --filter api prisma generate
```

4. Apply migrations and seed the database:

```bash
pnpm db:migrate
pnpm db:seed
```

5. Start the development stack:

```bash
pnpm dev
```

The API runs on `http://localhost:3333` and the web client on `http://localhost:5173`.
