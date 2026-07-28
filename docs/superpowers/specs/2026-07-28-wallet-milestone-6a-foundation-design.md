# Milestone 6a — Frontend Foundation (design)

**Status:** approved 2026-07-28 (revised — framework changed to React/Next.js)
**Implements:** the frontend promised in §3 "Tech stack" of
`2026-07-13-wallet-management-system-design.md`, as the first slice of Milestone 6.

---

## 0. Framework decision (change from the master design)

The master design named **Angular**. After deliberate re-examination this milestone uses
**React + Next.js (App Router)** instead:

- The frontend is a **staff back-office console** (not a customer app): every backend endpoint
  is a permission-gated *staff* action; the `user` role has no back-office access, so there is
  nothing customer-facing to build against the current API.
- **React/Next.js is the primary goal skill.** It has the larger freelance market and is the
  stack the builder wants next. "Finish the highest-value skill first" outweighs Angular's
  gentle-curve advantage.
- Next.js earns its place through the **BFF (Backend-for-Frontend)** pattern: server-side Route
  Handlers + middleware hold the auth cookies and proxy to NestJS, so tokens never touch
  JavaScript. That is a genuine Next.js skill, not "React with extra steps."
- **Angular is shelved as an optional future project.** If built later (e.g. a second frontend
  against the same API), it would still yield the "one API, many clients" story — but it is no
  longer on the committed path.

**Consequence for prior work:** an earlier task made NestJS set httpOnly cookies itself (the
right design for a *pure-SPA* Angular client with no server tier). Under the Next BFF, the
**BFF owns the cookies** and NestJS reverts to a clean token API. The only kept change is
`login` returning `{ user, tokens }` — exactly what the BFF consumes.

## 1. Goal

Stand up the frontend foundation: a logged-in staff user lands on a **role-aware, protected
application shell**, served by a real, tested auth pipeline. No feature screens yet — the
*plumbing* is real and tested; the *screens* (approvals, wallets, users, audit) arrive in
6b–6d.

**Definition of done**
1. Log in with seeded credentials (`admin@wallet.local` / `ChangeMe123!`) → land on the shell.
2. The shell's navigation shows **only** the sections the logged-in role has permission for.
3. Logout clears the session.
4. Visiting any protected route while logged out redirects to `/login`.
5. Tokens are **never** readable by JavaScript (httpOnly cookies held by the BFF).

## 2. Scope

**In scope**
- New `frontend/` Next.js app (App Router) + TypeScript + Tailwind + shadcn/ui.
- **BFF auth:** Next Route Handlers (`/api/auth/*`) proxy to NestJS and own the httpOnly
  cookies; `proxy.ts` (Next 16's renamed middleware) guards protected routes.
- **Backend sub-task:** revert NestJS to a clean token API for the BFF (keep `{ user, tokens }`;
  remove the NestJS-owns-cookies plumbing).
- Login page (react-hook-form + zod), protected app shell (sidebar + topbar), one placeholder
  dashboard route.
- Role-aware navigation + route protection driven by a client-side role→permission map.
- Silent access-token refresh in the server-side fetch wrapper.

**Out of scope (later slices / milestones)**
- Feature screens: approvals (6b), wallets (6c), users + audit (6d) — placeholders only here.
- Visual polish beyond a clean, functional shell.
- Playwright end-to-end tests (noted as a later addition).
- An Angular frontend (shelved, optional).

## 3. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router), React, TypeScript |
| UI | Tailwind CSS + shadcn/ui (Radix primitives; components owned in-repo) |
| Server state | TanStack Query (client components) |
| Forms | react-hook-form + zod |
| Auth transport | BFF: httpOnly cookies held by Next; `Bearer` forwarded to NestJS |
| Backend contract | NestJS token API: `login → { user, tokens }`, `Bearer` auth, body refresh/logout |
| Tests | Vitest + React Testing Library |
| Package manager | npm (matches backend) |

## 4. Architecture — the BFF

```
Browser ──▶ Next.js (Route Handlers + proxy) ──▶ NestJS (:3100) ──▶ Postgres
            holds httpOnly cookies;                    token API; RBAC;
            forwards Authorization: Bearer             ledger; audit
            NO domain logic                            ALL domain logic
```

The browser talks **only** to Next. Next holds `access_token` / `refresh_token` as
`httpOnly, Secure, SameSite=Lax` cookies (set via `next/headers`), reads the access token
server-side, and calls NestJS with `Authorization: Bearer`. Tokens are never exposed to
client JavaScript. The BFF holds **zero** business logic — it is a session/proxy tier.

## 5. Backend sub-task (NestJS → clean token API)

Revert the pure-SPA cookie plumbing; keep the useful return shape:

- `POST /auth/login` → returns `{ user: { id, email, role }, tokens: { accessToken, refreshToken } }`.
  (No `res.cookie`; the BFF sets cookies.)
- `POST /auth/refresh` → body `{ refreshToken }`; rotate; return `{ accessToken, refreshToken }`.
- `POST /auth/logout` → body `{ refreshToken }`; revoke; `204`.
- `GET /auth/me` → `{ id, email, role }`; authenticate via `Authorization: Bearer`.
- `JwtStrategy` → `fromAuthHeaderAsBearerToken()` (drop the cookie extractor).
- Remove `cookie-parser` from `main.ts` and uninstall it.
- Existing auth spec keeps the `{ user, tokens }` login assertion.

## 6. Next.js structure

```
frontend/
  app/
    login/page.tsx                 # login form (react-hook-form + zod), client component
    (dashboard)/layout.tsx         # protected shell: sidebar + topbar
    (dashboard)/page.tsx           # dashboard placeholder
    (dashboard)/{approvals,wallets,users,audit}/page.tsx  # gated placeholders
    api/auth/login/route.ts        # BFF: NestJS login → set cookies → return user
    api/auth/logout/route.ts       # BFF: NestJS logout → clear cookies
    api/auth/me/route.ts           # BFF: return current user (Bearer from cookie)
  proxy.ts                         # redirect unauthenticated users off protected routes (Next 16)
  lib/
    auth/permissions.ts            # role→permission map (mirrors seed) + helpers
    auth/session.ts                # cookie names, read/set/clear helpers (next/headers)
    api/server.ts                  # server fetch wrapper: Bearer + 401→refresh→retry
  components/                      # shadcn primitives + nav
```

## 7. Auth flow (BFF)

1. Login page (client) POSTs `{ email, password }` to Next `POST /api/auth/login`.
2. The Route Handler calls NestJS `/auth/login`, receives `{ user, tokens }`, sets the two
   httpOnly cookies, and returns `user` to the browser.
3. Client redirects to `/`.
4. `proxy.ts` guards the `(dashboard)` routes: no `access_token` cookie → redirect
   `/login`.
5. Data fetches run in server components / Route Handlers via `lib/api/server.ts`, which reads
   the access cookie and calls NestJS with `Bearer`.
6. **Silent refresh:** on a NestJS `401`, the wrapper calls `/auth/refresh` with the refresh
   cookie, resets both cookies, retries **once**; failure → clear cookies → redirect `/login`.
7. Logout: Route Handler calls NestJS `/auth/logout`, clears both cookies.

## 8. Role-aware shell

`lib/auth/permissions.ts` mirrors the seed's role→permission map:

| Role | Permissions |
|---|---|
| `super_admin` | all |
| `admin` | `user.manage`, `transaction.view_all`, `audit.view` |
| `finance` | `deposit.approve`, `withdrawal.approve`, `wallet.adjust`, `transaction.view_all` |
| `support` | `transaction.view_all` |
| `user` | *(none)* |

Navigation links (and each gated route) require a permission:

| Nav section (placeholder in 6a) | Required permission |
|---|---|
| Approvals | `deposit.approve` or `withdrawal.approve` |
| Wallets | `transaction.view_all` |
| Users | `user.manage` |
| Audit | `audit.view` |

A `user` (no permissions) sees a "no back-office access" state. **Client gating is UX only** —
NestJS still enforces every call; the map only decides what to render.

## 9. Error handling

| Situation | Behaviour |
|---|---|
| Wrong credentials | Inline generic "Invalid email or password" (no field enumeration) |
| Expired access token | Server wrapper refreshes silently and retries once |
| Refresh fails / no session | Clear cookies, redirect to `/login` |
| Protected route while logged out | `proxy.ts` redirects to `/login` |

## 10. Testing

- **Frontend (Vitest + RTL):** `permissions.ts` map + helpers; the login Route Handler (mock
  the NestJS fetch → asserts cookies set with the right flags, 401 surfaces as an auth error);
  the login form (success redirects, 401 shows the generic error); nav-gating (given a role,
  which links render).
- **Backend:** the existing auth specs continue to cover the `{ user, tokens }` login shape and
  Bearer authentication.
- **Later:** Playwright end-to-end (login → shell → logout), not in 6a.

## 11. Milestone 6 slice map (context)

| Slice | Delivers |
|---|---|
| **6a — Foundation** *(this spec)* | Next.js app, BFF cookie auth, role-aware protected shell |
| 6b — Approvals | Pending-approvals queue + approve/reject |
| 6c — Wallets | Wallet list/detail + deposit/withdrawal/transfer/adjustment forms |
| 6d — Users & Audit | User management + audit-log viewer |

Each slice is its own spec → plan → build cycle and ends in something that runs.
