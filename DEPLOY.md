# Deploying MaxOne

```
 browser ──► Vercel: staff console (frontend/)  ──BFF──►┐
 browser ──► Vercel: customer app (customer/)  ──BFF──►├──► Render: maxone-backend (API :3100) ──► Neon Postgres
             browser ──WebSocket──────────────────────►┘          │  ▲                       ──► Upstash Redis
                                                                  │  └── /health /metrics      ──► CloudAMQP RabbitMQ
                                                                  └─ publishes ─► RabbitMQ ─► Render: maxone-worker ─► Web Push
```

Everything is an env var. **No production code falls back to `localhost`** (M17): a missing URL fails at
boot with the variable's name, instead of silently pointing at a machine that isn't there.

## 1. Managed dependencies (create once)

| Service | Provider (free tier) | What you copy |
|---|---|---|
| Postgres | **Neon** (already in use) | `DATABASE_URL` |
| Redis | **Upstash** → Create database → *Redis* | the `rediss://default:<token>@<host>:6379` URL — append `/0` |
| RabbitMQ | **CloudAMQP** → New instance (Little Lemur) | the `amqps://<user>:<pass>@<host>/<user>` URL (the vhost IS the username — our topology is asserted per vhost, nothing to change) |

Both URLs are TLS (`rediss://`, `amqps://`); ioredis and amqplib handle that with no code change.

## 2. Render — API (+ optional worker)

**The consumer: free or paid.** Render's free instance type covers web services only; a Background
Worker starts on the Starter plan (~$7/mo). Two ways to run the queue consumer:

| | free (default) | paid |
|---|---|---|
| where the consumer runs | inside the API process (`CONSUMER_IN_PROCESS=true`) | separate `maxone-worker` service |
| queue / retries / DLQ / outbox | identical | identical |
| what you lose | the process boundary in prod (still real locally and in compose); a push-provider stall shares the API's event loop | nothing |
| `render.yaml` | API only (worker block commented out) | uncomment the worker block, set `CONSUMER_IN_PROCESS=false` on the API |

In-process, the consumer subscribes whenever the broker (re)connects and drains on SIGTERM — fail-soft,
because the API must keep serving HTTP. Never run both at once with the flag on.

If `maxone-backend` already exists from M8: keep it and add the new variables (matrix below) — no
blueprint needed. For a fresh account: **New → Blueprint** → this repo → Render creates the API from
`render.yaml`; then fill every `sync: false` variable. The API's image CMD runs `prisma migrate deploy`
on boot.

`autoDeploy: false` on both: CI fires `RENDER_DEPLOY_HOOK` only after every test job is green.
Create the hook under the API service → Settings → Deploy Hook; a second hook for the worker goes in
the same CI step if you want it deployed on every green push (or redeploy it manually — it changes rarely).

## 3. Vercel — two projects

| Project | Root directory | Env |
|---|---|---|
| staff console (existing) | `frontend/` | `API_BASE_URL=https://maxone-backend.onrender.com` |
| customer app (**new**) | `customer/` | `API_BASE_URL` (same), `NEXT_PUBLIC_WS_URL=https://maxone-backend.onrender.com`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (= backend `VAPID_PUBLIC_KEY`) |

Automatic production deploys from `main` are switched off **in code**: each app's `vercel.json` has
`git.deploymentEnabled.main = false` (pull-request previews stay on). Deploy Hooks are explicit
triggers and are not affected by that setting. On **both** projects: Settings → Deploy Hooks →
create one on `main` → paste as GitHub secrets `VERCEL_DEPLOY_HOOK` (staff) and
`VERCEL_CUSTOMER_DEPLOY_HOOK` (customer). From then on a push to `main` deploys nothing by itself;
CI fires the hooks only when every job is green — the same gate the backend has had since M9.

## 4. Env-var matrix

| var | API | worker | staff | customer | value |
|---|:-:|:-:|:-:|:-:|---|
| `DATABASE_URL` | ✔ | ✔ | | | Neon |
| `REDIS_URL` | ✔ | ✔ | | | Upstash `rediss://…/0` |
| `RABBITMQ_URL` | ✔ | ✔ | | | CloudAMQP `amqps://…` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | ✔ | | | | long random strings |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | ✔ | ✔ | | | `npx web-push generate-vapid-keys`; subject `mailto:` |
| `WEBAUTHN_RP_ID` | ✔ | | | | customer hostname, e.g. `maxone-customer.vercel.app` |
| `WEBAUTHN_RP_NAME` | ✔ | | | | `MaxOne` |
| `WEBAUTHN_ORIGIN` | ✔ | | | | `https://maxone-customer.vercel.app` |
| `FRONTEND_ORIGIN` | ✔ | | | | same customer origin (CORS for the WebSocket) |
| `PORT` | ✔ | | | | `3100` |
| `NODE_ENV` | ✔ | ✔ | | | `production` (JSON logs, no pretty-print) |
| `LOG_LEVEL` | ✔ | ✔ | | | `info` |
| `SERVICE_NAME` | ✔ | ✔ | | | `api` / `worker` (tags every log line) |
| `CONSUMER_IN_PROCESS` | ✔ | | | | `true` (free tier) / `false` when a separate worker runs |
| `SENTRY_DSN` | opt | opt | | | Sentry project DSN; unset = disabled |
| `COINGECKO_API_KEY` | opt | | | | CoinGecko free Demo key (`x-cg-demo-api-key`); unset = keyless, which Render's shared IP gets rate-limited on → empty Markets. Failures are logged as `CoinGecko <status> …` |
| `API_BASE_URL` | | | ✔ | ✔ | `https://maxone-backend.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | | | | ✔ | `https://maxone-backend.onrender.com` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | | | | ✔ | = `VAPID_PUBLIC_KEY` |

GitHub Actions secrets: `RENDER_DEPLOY_HOOK`, `VERCEL_DEPLOY_HOOK`, `VERCEL_CUSTOMER_DEPLOY_HOOK`.

## 5. Smoke checklist after a deploy

1. `curl https://maxone-backend.onrender.com/health` → `{"status":"ok","db":"up","redis":"up","rabbitmq":"up",…}` (200). `degraded` tells you which dependency to look at; 503 = Postgres.
2. `curl …/metrics | grep maxone_` → the five gauges.
3. Render → API → Logs: `Connected to RabbitMQ`, `in-process consumer subscribed (boot)` (or, with a paid worker: maxone-worker → `Worker up`).
4. Customer app: sign up, subscribe to push; staff console: approve a deposit → toast in the open tab, push on the closed device; worker log shows `push sent id=… req=<the API request id>`.
5. CloudAMQP → RabbitMQ Manager: `notifications.push.dead` = 0. If not, the API log has `ALERT dead-letters` (and Sentry, if configured).

## Local development

`docker compose up -d db redis rabbitmq`, copy the three `.env.example` files, `npm run start:dev`
(API), `npm run start:worker` (worker). Compose's `backend`/`worker` services use the in-network
hostnames `db`, `redis`, `rabbitmq` — never localhost.
