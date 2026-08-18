# MaxOne

**MaxOne** is a full-stack wallet/ledger platform: a **NestJS + Prisma + PostgreSQL** API (RBAC,
immutable ledger, transfers, FX, audit) with a **Next.js** staff console in front of it via a
Backend-for-Frontend (BFF) auth tier. A customer-facing app is planned (one API, many clients).

- `backend/` — NestJS API (JWT + rotating refresh tokens, permission-based RBAC, wallets/ledger,
  audit logging). Hardened with `helmet`, CORS, and rate limiting.
- `frontend/` — Next.js (App Router) back-office console; the Next server holds httpOnly cookies
  and proxies to the API (tokens never reach the browser).

## Run the backend with Docker

The backend is containerized; `docker compose up` runs the API **and** Postgres together. The
backend applies database migrations automatically on boot.

```bash
# 1. Environment: copy the template and fill in real values (DB creds + JWT secrets)
cp .env.example .env

# 2. Build + start db + backend (the backend runs `prisma migrate deploy` on boot)
docker compose up -d --build

# 3. One-time: seed the super-admin (run from the host — the prod image has no ts-node)
cd backend && npm run prisma:seed

# The API is now on http://localhost:3100
#   login: admin@wallet.local / ChangeMe123!
```

**What you get:**
- Backend runs as a **non-root** user; migrations apply automatically on boot.
- **Security headers** (`helmet`) on every response; **rate limiting** (100 req/min/IP globally,
  5 login attempts/min/IP).
- Postgres data persists in the `wallet_pgdata` volume across restarts.

**Useful commands:**
```bash
docker compose ps              # service status + health
docker compose logs -f backend # follow backend logs
docker compose down            # stop (keeps the DB volume/data)
docker compose down -v         # stop AND wipe the DB volume (clean slate)
```

## Local development (without Docker)

```bash
docker start wallet_db 2>/dev/null || docker compose up -d db   # just Postgres
cd backend  && npm install && npm run prisma:migrate && npm run prisma:seed && npm run start:dev  # :3100
cd frontend && npm install && npm run dev                                                          # :3200
```

## Ports

| Service | Port |
|---|---|
| Backend API (NestJS) | `3100` |
| Frontend (Next.js dev) | `3200` |
| PostgreSQL | `5432` |
