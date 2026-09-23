# MaxOne

**MaxOne** is a full-stack wallet/ledger platform: one **NestJS + Prisma + PostgreSQL** API (RBAC,
immutable ledger, transfers, FX, audit, live prices) with two **Next.js** clients in front of it,
each through its own Backend-for-Frontend (BFF) auth tier so tokens never reach the browser.

- `backend/` — NestJS API (JWT + rotating refresh tokens, permission-based RBAC, wallets/ledger,
  audit logging, transactional outbox → RabbitMQ, Redis cache-aside, Socket.IO live prices and
  balances). Hardened with `helmet`, CORS, and rate limiting.
- `frontend/` — the **staff console** (Next.js App Router): approvals, audit, wallet operations.
  Signed in with the seeded admin. Dev port `3200`.
- `customer/` — the **customer app** (Next.js App Router, mobile-first): wallet, send/receive by
  @handle, exchange between currencies, markets with candlestick charts, price alerts, passkeys,
  2FA, web push. Customers sign up themselves. Dev port `3300`.

## Deploying

See [DEPLOY.md](DEPLOY.md): Render (API via `render.yaml`), Neon Postgres, Upstash Redis, CloudAMQP,
two Vercel projects (staff console + customer app), the env-var matrix, and the smoke checklist.
Nothing in production code falls back to localhost — every URL is an env var.

## Local setup — everything running

**Prerequisites:** Node 22 (what CI runs; `Intl` output differs between Node majors, so tests can
disagree on another version), Docker Desktop, npm.

```bash
# 1. Environment files (copy, then fill in the secrets the comments describe)
cp .env.example .env                        # backend: DB creds, JWT secrets, VAPID keys, WebAuthn origin
cp frontend/.env.example frontend/.env.local   # staff console: API_BASE_URL=http://localhost:3100
cp customer/.env.example customer/.env.local   # customer app: API_BASE_URL, NEXT_PUBLIC_WS_URL, NEXT_PUBLIC_VAPID_PUBLIC_KEY

# 2. Infrastructure: Postgres + Redis + RabbitMQ in Docker (the API tolerates the last two being down)
docker compose up -d db redis rabbitmq

# 3. Backend API on :3100 — install, migrate, seed the staff admin, run in watch mode
cd backend && npm install && npm run prisma:migrate && npm run prisma:seed && npm run start:dev

# 4. Staff console on :3200 (second terminal)
cd frontend && npm install && npm run dev

# 5. Customer app on :3300 (third terminal)
cd customer && npm install && npm run dev

# Optional: the queue consumer as its own process (locally the API also runs it in-process)
cd backend && npm run start:worker
```

**Sign in.** Staff console: `admin@wallet.local` / `ChangeMe123!` (from the seed). Customer app:
create an account at http://localhost:3300/signup — the seed does not create customers.

**Gotchas we hit:**
- `prisma migrate reset` wipes the DB but does **not** re-seed (no `prisma.seed` hook). Run
  `npm run prisma:seed` afterwards or every staff login is a 500.
- The customer app opens its WebSocket straight to the API, so `NEXT_PUBLIC_WS_URL` must be the API
  origin and `FRONTEND_ORIGIN` in the root `.env` must be the customer app's origin (CORS).
- `VAPID_PUBLIC_KEY` (backend) and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (customer) must be the same key.
- Passkeys need `WEBAUTHN_RP_ID=localhost` and `WEBAUTHN_ORIGIN=http://localhost:3300` locally.

## Run the backend with Docker

The backend is containerized; `docker compose up` runs the API, the **worker**, Postgres, Redis and
RabbitMQ together. The backend applies database migrations automatically on boot.

```bash
# 1. Environment: copy the template and fill in real values (DB creds + JWT secrets)
cp .env.example .env

# 2. Build + start db + backend (the backend runs `prisma migrate deploy` on boot)
docker compose up -d --build

# 3. One-time: seed the super-admin (run from the host — the prod image has no ts-node)
cd backend && npm run prisma:seed

# The API is now on http://localhost:3100
```

**What you get:**
- Backend runs as a **non-root** user; migrations apply automatically on boot.
- **Security headers** (`helmet`) on every response; **rate limiting** (100 req/min/IP globally,
  5 login attempts/min/IP).
- Postgres data persists in the `wallet_pgdata` volume across restarts; queued messages persist in
  `wallet_rabbitmq`. Redis is a cache only (no volume — the app runs unchanged without it).
- **Services:** `db` (Postgres), `redis` (cache-aside for market/FX data), `rabbitmq` (message
  broker, management UI at http://localhost:15672, guest/guest), `backend` (API :3100), `worker`
  (consumes `notifications.push` and sends Web Push — off the HTTP request; failed pushes retry via
  `notifications.push.retry.{1,2,3}` (5s/30s/120s) then park in `notifications.push.dead` for a
  human; redeliveries are deduped on the event id via Redis). Events are written to an **outbox
  table in the same DB transaction** as the ledger row and relayed to the broker, so a broker
  outage delays a notification instead of losing it.
  In production on the free tier the consumer runs inside the API process (`CONSUMER_IN_PROCESS=true`);
  locally and in compose it is a separate `worker` process.

**Useful commands:**
```bash
docker compose ps              # service status + health
docker compose logs -f backend # follow backend logs
docker compose logs -f worker  # follow the queue consumer
docker compose down            # stop (keeps the DB volume/data)
docker compose down -v         # stop AND wipe the DB volume (clean slate — then re-seed)
```

## Tests

```bash
cd backend  && npx tsc --noEmit && npm test && npm run test:integration   # integration lane needs the Docker services up
cd frontend && npx tsc --noEmit && npm test
cd customer && npx tsc --noEmit && npm test
```

CI (`.github/workflows/ci.yml`) runs the same three lanes in parallel on every PR and push to main;
a push to main that is green triggers the Render and Vercel deploy hooks. Auto-deploy is off on both
hosts, so CI is the only path to production.

## Ports

| Service | Port |
|---|---|
| Backend API (NestJS) | `3100` |
| Staff console (Next.js dev) | `3200` |
| Customer app (Next.js dev) | `3300` |
| PostgreSQL | `5432` |
| Redis | `6379` |
| RabbitMQ (AMQP / management UI) | `5672` / `15672` |
