# Milestone 6a — Frontend Foundation (design)

**Status:** approved 2026-07-28
**Implements:** the frontend promised in §3 "Tech stack" of
`2026-07-13-wallet-management-system-design.md`, as the first slice of Milestone 6.

---

## 0. Framework decision (change from the master design)

The master design named **Angular** for the frontend. This milestone **keeps Angular** — but
the decision was re-examined and made deliberately, not inherited:

- The frontend is a **staff back-office console**, not a customer app. Every backend endpoint
  is a permission-gated *staff* action (`transaction.view_all`, `deposit.approve`, …); the
  `user` role has zero back-office permissions. So there is nothing customer-facing to build
  against the current API.
- Angular mirrors NestJS (modules, DI, guards) — one mental model, gentle curve right after
  five backend milestones. It is also a strong, authentic fit for enterprise/fintech/iGaming
  back-office consoles.
- **Committed future work:** a separate **React/Next.js customer portal** (needs new
  customer-scoped backend endpoints first). That yields the portfolio narrative:
  **one NestJS API → an Angular staff console + a React/Next customer portal**, demonstrating
  two frameworks and the "one API, many clients" boundary — without ever mixing frameworks
  inside a single app.

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
5. Tokens are **never** readable by JavaScript (httpOnly cookies).

## 2. Scope

**In scope**
- New `frontend/` Angular app (standalone components) + Angular Material.
- **Backend sub-task:** switch NestJS auth to **httpOnly-cookie** sessions.
- Login page (reactive form), protected app shell (sidebar + topbar), one placeholder
  dashboard route.
- Role-aware navigation + route guards driven by a client-side role→permission map.
- Silent access-token refresh via an HTTP interceptor.

**Out of scope (later slices / milestones)**
- Feature screens: approvals (6b), wallets (6c), users + audit (6d) — placeholders only here.
- Visual polish beyond a clean, functional shell.
- The React/Next.js customer portal and its backend endpoints (future milestone).
- Playwright end-to-end tests (noted as a later addition).

## 3. Stack

| Concern | Choice |
|---|---|
| Framework | Angular, standalone components |
| Language | TypeScript |
| UI library | Angular Material (MatTable/CDK, forms, dialogs, theming) |
| State | Services + signals; RxJS for HTTP |
| Forms | Angular Reactive Forms |
| Auth transport | Backend-set httpOnly cookies + `withCredentials` |
| Dev networking | Angular dev-server proxy (`/api/*` → NestJS `:3100`) |
| Tests | Angular default (Jasmine + Karma) |
| Package manager | npm (matches backend) |

## 4. Architecture — pure SPA + backend cookie auth + dev proxy

Angular is a **pure client-side SPA** (static JS/HTML in the browser); it has no server tier of
its own. Security therefore lives in the **backend + the browser's cookie rules**, not in a
BFF:

```
Browser ──▶ Angular dev proxy (:4200) ──▶ NestJS (:3100) ──▶ Postgres
            single origin; cookies are     sets/reads httpOnly
            first-party (SameSite=Lax)      cookies; RBAC; ledger
```

**Why the dev proxy matters.** Talking cross-origin (`:4200` → `:3100`) would force
`SameSite=None` cookies and a full CSRF-token scheme. Routing all API calls through Angular's
dev proxy makes the browser see a **single origin**, so cookies are **first-party** and
`httpOnly; Secure; SameSite=Lax` is sufficient — **no CORS, minimal CSRF surface**. This also
mirrors a production reverse-proxy / same-origin deployment.

## 5. Backend sub-task (NestJS cookie auth)

Tokens currently arrive in the login **response body**. Change to cookies:

- Add `cookie-parser`.
- `POST /auth/login` — set `access_token` and `refresh_token` as
  `httpOnly; Secure; SameSite=Lax` cookies (via `@Res({ passthrough: true })`); return the
  **safe user** `{ id, email, role }` in the body instead of raw tokens.
- `JwtStrategy` — extract the JWT from the `access_token` cookie. Keep
  `fromAuthHeaderAsBearerToken` as a fallback so existing curl/tests still work.
- `POST /auth/refresh` — read the refresh token from its cookie, rotate, reset both cookies.
- `POST /auth/logout` — read the refresh cookie, revoke server-side, **clear** both cookies.
- `GET /auth/me` — unchanged; the guard now reads the cookie.
- **CSRF posture:** `SameSite=Lax` first-party cookies plus the same-origin proxy neutralise
  cross-site POSTs. A double-submit CSRF token is noted as a hardening option for a future
  production-polish milestone, not built here.
- **Tests:** extend the existing auth specs — login sets the two cookies with the right flags;
  the guard authenticates from a cookie; logout clears them.

## 6. Angular structure

```
frontend/
  src/app/
    core/auth/
      auth.service.ts            # login/logout/me; current user in a signal
      auth.guard.ts              # CanActivate: authed? else redirect /login
      permission.guard.ts        # CanActivate: role holds required permission?
      permissions.ts             # role→permission map (mirrors seed) + helpers
      credentials.interceptor.ts # withCredentials on every call; 401 → refresh → retry once
    features/
      login/login.component.ts   # reactive-form login
      dashboard/dashboard.component.ts  # placeholder landing
    layout/
      shell.component.ts         # sidebar + topbar; role-aware nav; logout
    app.routes.ts                # routes + guards
    app.config.ts                # providers: HttpClient(+interceptor), Material, router
  proxy.conf.json                # /api → http://localhost:3100
```

## 7. Auth flow

1. Login component posts `{ email, password }` to `/api/auth/login` (proxied).
2. NestJS validates, sets the httpOnly cookies, returns `{ id, email, role }`.
3. `AuthService` stores the user in a signal; the router navigates to `/`.
4. `authGuard` protects dashboard routes: if no known user, it calls `/api/auth/me`; a 401
   redirects to `/login`.
5. `credentialsInterceptor` attaches `withCredentials` to every request so cookies ride along.
6. On a 401 from any call, the interceptor calls `/api/auth/refresh` **once**; on success it
   retries the original request; on failure it clears the user and redirects to `/login`.
7. Logout calls `/api/auth/logout`, which clears the cookies; `AuthService` clears the user.

## 8. Role-aware shell

`permissions.ts` mirrors the seed's role→permission map:

| Role | Permissions |
|---|---|
| `super_admin` | all |
| `admin` | `user.manage`, `transaction.view_all`, `audit.view` |
| `finance` | `deposit.approve`, `withdrawal.approve`, `wallet.adjust`, `transaction.view_all` |
| `support` | `transaction.view_all` |
| `user` | *(none)* |

Navigation links **and** route guards gate on permission:

| Nav section (placeholder in 6a) | Required permission |
|---|---|
| Approvals | `deposit.approve` or `withdrawal.approve` |
| Wallets | `transaction.view_all` |
| Users | `user.manage` |
| Audit | `audit.view` |

A `user` (no permissions) sees a "no back-office access" state. **Client gating is UX only** —
NestJS still enforces every call server-side; the client map only decides what to *show*.

## 9. Error handling

| Situation | Behaviour |
|---|---|
| Wrong credentials | Inline generic "Invalid email or password" (no enumeration of which field) |
| Expired access token | Interceptor refreshes silently and retries once |
| Refresh fails / no session | Clear user, redirect to `/login` |
| Protected route while logged out | `authGuard` redirects to `/login` |

## 10. Testing

- **Frontend (Jasmine/Karma):** `permissions.ts` map + helpers; `authGuard`/`permissionGuard`
  decisions; `AuthService` against a mocked `HttpClient` (login stores user, logout clears,
  401 path).
- **Backend:** extend auth specs for cookie-setting on login, cookie extraction in the guard,
  and cookie-clearing on logout.
- **Later:** Playwright end-to-end (login → shell → logout), not in 6a.

## 11. Milestone 6 slice map (context)

| Slice | Delivers |
|---|---|
| **6a — Foundation** *(this spec)* | Angular app, cookie auth, role-aware protected shell |
| 6b — Approvals | Pending-approvals queue + approve/reject |
| 6c — Wallets | Wallet list/detail + deposit/withdrawal/transfer/adjustment forms |
| 6d — Users & Audit | User management + audit-log viewer |

Each slice is its own spec → plan → build cycle and ends in something that runs.
