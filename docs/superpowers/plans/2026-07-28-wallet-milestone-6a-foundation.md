# Milestone 6a — Frontend Foundation Implementation Plan (React/Next.js + BFF)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Next.js staff back-office console foundation — a Backend-for-Frontend (BFF) auth tier that holds httpOnly cookies and proxies to NestJS, plus a role-aware protected shell reachable only after login.

**Architecture:** The browser talks only to Next.js. Next Route Handlers (`/api/auth/*`) call NestJS (`:3100`), set the auth cookies via `next/headers`, and forward `Authorization: Bearer` server-side — tokens never touch client JS. A readable-server-side `session_user` cookie (httpOnly, non-sensitive `{id,email,role}` JSON) lets server components render the role-aware shell without re-calling NestJS during render (Next forbids cookie writes during render, so we avoid needing a refresh there). `middleware.ts` redirects unauthenticated users off protected routes. NestJS reverts to a clean token API.

**Tech Stack:** Next.js (App Router) + React + TypeScript + Tailwind + shadcn/ui + react-hook-form + zod; Vitest + React Testing Library. Backend: NestJS token API.

## Global Constraints

- **Ports:** NestJS runs with `PORT=3100`. Next dev runs on **`-p 3200`** (port 3000 is taken by an unrelated container). The BFF calls NestJS server-side via `API_BASE_URL` (default `http://localhost:3100`) — there is NO browser-facing proxy (unlike an SPA).
- **Cookie flags:** `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `secure` gated on `process.env.NODE_ENV === 'production'` (MUST be `false` in dev over `http://localhost`).
- **Cookie names / maxAge:** `access_token` (15 min = 900 s), `refresh_token` (7 days = 604800 s), `session_user` (7 days, JSON `{id,email,role}`).
- **Next 15 async APIs:** `cookies()` from `next/headers` is **async** — always `const store = await cookies()`.
- **Cookie writes only in Route Handlers / Server Actions**, never during a Server Component render.
- **Client gating is UX-only.** NestJS enforces every request; the frontend permission map only decides what to render.
- **DB reset caveat:** re-seed with `npm run prisma:seed` (no auto-seed hook).
- **Seeded login for proofs:** `admin@wallet.local` / `ChangeMe123!` (role `super_admin`).

---

## File Structure

**Backend (revert to clean token API):**
- `backend/src/auth/auth.controller.ts` — remove cookie plumbing; login returns `{ user, tokens }`.
- `backend/src/auth/jwt.strategy.ts` — Bearer-only extractor.
- `backend/src/main.ts` — remove `cookie-parser`.
- `backend/src/auth/auth.service.ts` — unchanged (`login → { user, tokens }` stays).

**Frontend (`frontend/`):**
- `lib/auth/cookie-names.ts` — cookie name constants, `SessionUser` type, `cookieOptions()` (pure, edge-safe).
- `lib/auth/session.ts` — async cookie helpers (`setAuthCookies`, `refreshAuthCookies`, `clearAuthCookies`, `getSessionUser`).
- `lib/auth/permissions.ts` — role→permission map + helpers.
- `app/api/auth/{login,logout,me,refresh}/route.ts` — BFF handlers.
- `middleware.ts` — auth-presence route guard.
- `app/login/page.tsx` — login form (react-hook-form + zod).
- `app/(dashboard)/layout.tsx` — protected shell (reads `session_user`).
- `app/(dashboard)/page.tsx` — dashboard placeholder.
- `app/(dashboard)/{approvals,wallets,users,audit}/page.tsx` — permission-gated placeholders.
- `components/nav.tsx`, `components/topbar.tsx` — role-aware nav + logout.

**Deferred to 6b (noted, not built now):** `lib/api/server.ts` (Bearer + 401-refresh fetch wrapper) — there is no domain data call in 6a to exercise it; the `/api/auth/refresh` handler mechanism IS built now.

---

## Task 1: Backend — revert NestJS to a clean token API

**Files:**
- Modify: `backend/src/auth/auth.controller.ts`
- Modify: `backend/src/auth/jwt.strategy.ts`
- Modify: `backend/src/main.ts`

**Interfaces:**
- Produces: `POST /auth/login → { user: {id,email,role}, tokens: {accessToken,refreshToken} }`; `POST /auth/refresh` (body `{refreshToken}`) `→ {accessToken,refreshToken}`; `POST /auth/logout` (body `{refreshToken}`) `→ 204`; `GET /auth/me` authenticates via `Authorization: Bearer`.

- [ ] **Step 1: Restore the plain controller**

Replace `backend/src/auth/auth.controller.ts`:

```typescript
import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthUser } from './jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokensService: TokensService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    // Returns { user, tokens } — the BFF sets cookies from tokens and returns user.
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.tokensService.rotate(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.tokensService.revoke(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
```

- [ ] **Step 2: Restore the Bearer-only JWT extractor**

In `backend/src/auth/jwt.strategy.ts`, remove the `Request` import and replace the extractor:

```typescript
      // Pull the token from the "Authorization: Bearer <token>" header.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
```
Delete the now-unused `import type { Request } from 'express';` line.

- [ ] **Step 3: Remove cookie-parser from main.ts**

In `backend/src/main.ts`, delete the `import cookieParser from 'cookie-parser';` line and the `app.use(cookieParser());` line (with its comment).

- [ ] **Step 4: Uninstall cookie-parser**

Run: `cd backend && npm uninstall cookie-parser @types/cookie-parser`

- [ ] **Step 5: Run the backend suite + typecheck**

Run: `cd backend && npx jest && npx tsc --noEmit`
Expected: all 84 tests PASS (the `{ user, tokens }` login assertion still holds); tsc clean.

- [ ] **Step 6: Manual proof — token API + Bearer auth**

Start Postgres (`docker compose up -d` at repo root) and the API (`cd backend && PORT=3100 npm run start:dev` in a background shell). Then:

```bash
curl -s -X POST http://localhost:3100/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@wallet.local","password":"ChangeMe123!"}'
```
Expected: `{"user":{"id":"…","email":"admin@wallet.local","role":"super_admin"},"tokens":{"accessToken":"…","refreshToken":"…"}}` — and NO `Set-Cookie` header. Then confirm Bearer auth:

```bash
TOKEN=$(curl -s -X POST http://localhost:3100/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@wallet.local","password":"ChangeMe123!"}' | npx --yes json accessToken 2>/dev/null || echo)
# If `json` is unavailable, copy the accessToken from the previous output manually.
curl -s http://localhost:3100/auth/me -H "Authorization: Bearer $TOKEN"
```
Expected: `{"id":"…","email":"admin@wallet.local","role":"super_admin"}`. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
cd .. && git add backend/src/auth/auth.controller.ts backend/src/auth/jwt.strategy.ts backend/src/main.ts backend/package.json backend/package-lock.json
git commit -m "refactor(auth): revert NestJS to a clean token API for the BFF (Milestone 6a, Task 1)"
```

---

## Task 2: Scaffold Next.js + Tailwind + shadcn/ui + Vitest

**Files:**
- Create: `frontend/` (Next.js workspace)
- Create: `frontend/.env.local`, `frontend/vitest.config.ts`, `frontend/vitest.setup.ts`

**Interfaces:**
- Produces: a buildable Next.js app; `npm test` runs Vitest headless; shadcn primitives available under `components/ui/`.

- [ ] **Step 1: Generate the app**

From the repo root:

```bash
npx create-next-app@latest frontend --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --no-turbopack --yes
```

- [ ] **Step 2: Point the BFF at NestJS**

Create `frontend/.env.local`:

```
API_BASE_URL=http://localhost:3100
```

- [ ] **Step 3: Set the dev port to 3200**

In `frontend/package.json`, change the `dev` script to:

```json
"dev": "next dev -p 3200",
```

- [ ] **Step 4: Initialise shadcn/ui + add primitives**

```bash
cd frontend && npx shadcn@latest init -d && npx shadcn@latest add button input label card
```
(Accept any prompt defaults.)

- [ ] **Step 5: Install + configure Vitest**

```bash
npm install -D vitest @vitejs/plugin-react jsdom vite-tsconfig-paths \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Create `frontend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
});
```

Create `frontend/vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

Add to `frontend/package.json` scripts:

```json
"test": "vitest run",
```

- [ ] **Step 6: Smoke-test the toolchain**

Create `frontend/lib/smoke.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
describe('toolchain', () => {
  it('runs', () => expect(1 + 1).toBe(2));
});
```

Run: `cd frontend && npm test`
Expected: 1 test PASSES. Then delete `frontend/lib/smoke.test.ts`.

- [ ] **Step 7: Verify the build**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
cd .. && rm -f frontend/lib/smoke.test.ts && git add frontend && git commit -m "chore(frontend): scaffold Next.js app with Tailwind, shadcn/ui, Vitest (Milestone 6a, Task 2)"
```

---

## Task 3: Role → permission map

**Files:**
- Create: `frontend/lib/auth/permissions.ts`
- Test: `frontend/lib/auth/permissions.test.ts`

**Interfaces:**
- Produces:
  - `type Permission = 'deposit.approve' | 'withdrawal.approve' | 'wallet.adjust' | 'user.manage' | 'audit.view' | 'transaction.view_all'`
  - `permissionsForRole(role: string): Permission[]`
  - `roleHasPermission(role: string, permission: Permission): boolean`

- [ ] **Step 1: Write the failing test**

Create `frontend/lib/auth/permissions.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { permissionsForRole, roleHasPermission } from './permissions';

describe('permissions map', () => {
  it('gives super_admin every permission', () => {
    expect(permissionsForRole('super_admin')).toHaveLength(6);
    expect(roleHasPermission('super_admin', 'audit.view')).toBe(true);
  });
  it('gives finance approvals + adjust but not user.manage', () => {
    expect(roleHasPermission('finance', 'deposit.approve')).toBe(true);
    expect(roleHasPermission('finance', 'wallet.adjust')).toBe(true);
    expect(roleHasPermission('finance', 'user.manage')).toBe(false);
  });
  it('gives support only read', () => {
    expect(permissionsForRole('support')).toEqual(['transaction.view_all']);
  });
  it('gives a plain user nothing, and unknown roles nothing', () => {
    expect(permissionsForRole('user')).toEqual([]);
    expect(permissionsForRole('nope')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx vitest run lib/auth/permissions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the map**

Create `frontend/lib/auth/permissions.ts`:

```typescript
export type Permission =
  | 'deposit.approve'
  | 'withdrawal.approve'
  | 'wallet.adjust'
  | 'user.manage'
  | 'audit.view'
  | 'transaction.view_all';

const ALL: Permission[] = [
  'deposit.approve',
  'withdrawal.approve',
  'wallet.adjust',
  'user.manage',
  'audit.view',
  'transaction.view_all',
];

// Mirrors backend/prisma/seed.ts ROLE_PERMISSIONS. UX-only: the API still enforces.
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: ALL,
  admin: ['user.manage', 'transaction.view_all', 'audit.view'],
  finance: ['deposit.approve', 'withdrawal.approve', 'wallet.adjust', 'transaction.view_all'],
  support: ['transaction.view_all'],
  user: [],
};

export function permissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: string, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `cd frontend && npx vitest run lib/auth/permissions.test.ts`
Expected: PASS (4 specs).

- [ ] **Step 5: Commit**

```bash
cd .. && git add frontend/lib/auth/permissions.ts frontend/lib/auth/permissions.test.ts
git commit -m "feat(frontend): add role→permission map mirroring the seed (Milestone 6a, Task 3)"
```

---

## Task 4: Session cookie helpers

**Files:**
- Create: `frontend/lib/auth/cookie-names.ts`
- Create: `frontend/lib/auth/session.ts`
- Test: `frontend/lib/auth/session.test.ts`

**Interfaces:**
- Produces (cookie-names.ts, pure/edge-safe):
  - `ACCESS_COOKIE`, `REFRESH_COOKIE`, `SESSION_USER_COOKIE` (string consts)
  - `interface SessionUser { id: string; email: string; role: string }`
  - `cookieOptions(maxAgeSeconds: number)` → cookie option object
- Produces (session.ts, async):
  - `setAuthCookies(user: SessionUser, tokens: { accessToken: string; refreshToken: string }): Promise<void>`
  - `refreshAuthCookies(tokens: { accessToken: string; refreshToken: string }): Promise<void>`
  - `clearAuthCookies(): Promise<void>`
  - `getSessionUser(): Promise<SessionUser | null>`

- [ ] **Step 1: Create the pure cookie-names module**

Create `frontend/lib/auth/cookie-names.ts`:

```typescript
export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const SESSION_USER_COOKIE = 'session_user';

export const ACCESS_MAX_AGE = 15 * 60; // 15 min
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  role: string;
}

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
```

- [ ] **Step 2: Write the failing test**

Create `frontend/lib/auth/session.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = { set: vi.fn(), get: vi.fn(), delete: vi.fn() };
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => store) }));

import { cookieOptions } from './cookie-names';
import { setAuthCookies, clearAuthCookies, getSessionUser } from './session';

describe('cookieOptions', () => {
  it('is httpOnly, lax, root path, not secure in test env', () => {
    expect(cookieOptions(900)).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 900,
    });
  });
});

describe('session cookies', () => {
  beforeEach(() => vi.clearAllMocks());

  it('setAuthCookies writes all three cookies', async () => {
    await setAuthCookies({ id: 'u1', email: 'a@b.c', role: 'admin' }, { accessToken: 'a', refreshToken: 'r' });
    const names = store.set.mock.calls.map((c) => c[0]);
    expect(names).toEqual(['access_token', 'refresh_token', 'session_user']);
    expect(store.set).toHaveBeenCalledWith('access_token', 'a', expect.objectContaining({ httpOnly: true }));
  });

  it('clearAuthCookies deletes all three', async () => {
    await clearAuthCookies();
    expect(store.delete.mock.calls.map((c) => c[0])).toEqual(['access_token', 'refresh_token', 'session_user']);
  });

  it('getSessionUser parses the session_user cookie, or null', async () => {
    store.get.mockReturnValueOnce({ value: JSON.stringify({ id: 'u1', email: 'a@b.c', role: 'admin' }) });
    expect(await getSessionUser()).toEqual({ id: 'u1', email: 'a@b.c', role: 'admin' });
    store.get.mockReturnValueOnce(undefined);
    expect(await getSessionUser()).toBeNull();
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `cd frontend && npx vitest run lib/auth/session.test.ts`
Expected: FAIL — `session` module not found.

- [ ] **Step 4: Implement session.ts**

Create `frontend/lib/auth/session.ts`:

```typescript
import { cookies } from 'next/headers';
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE,
  SESSION_USER_COOKIE,
  SessionUser,
  cookieOptions,
} from './cookie-names';

type Tokens = { accessToken: string; refreshToken: string };

export async function setAuthCookies(user: SessionUser, tokens: Tokens): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(ACCESS_MAX_AGE));
  store.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_MAX_AGE));
  store.set(SESSION_USER_COOKIE, JSON.stringify(user), cookieOptions(REFRESH_MAX_AGE));
}

export async function refreshAuthCookies(tokens: Tokens): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(ACCESS_MAX_AGE));
  store.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_MAX_AGE));
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(SESSION_USER_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_USER_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `cd frontend && npx vitest run lib/auth/session.test.ts`
Expected: PASS (5 specs).

- [ ] **Step 6: Commit**

```bash
cd .. && git add frontend/lib/auth/cookie-names.ts frontend/lib/auth/session.ts frontend/lib/auth/session.test.ts
git commit -m "feat(frontend): add BFF session cookie helpers (Milestone 6a, Task 4)"
```

---

## Task 5: BFF Route Handlers (login, logout, me, refresh)

**Files:**
- Create: `frontend/app/api/auth/login/route.ts`
- Create: `frontend/app/api/auth/logout/route.ts`
- Create: `frontend/app/api/auth/me/route.ts`
- Create: `frontend/app/api/auth/refresh/route.ts`
- Test: `frontend/app/api/auth/login/route.test.ts`

**Interfaces:**
- Consumes: `setAuthCookies`, `refreshAuthCookies`, `clearAuthCookies`, `getSessionUser`, `REFRESH_COOKIE`; env `API_BASE_URL`.
- Produces: `POST /api/auth/login` → sets cookies, returns `{id,email,role}` (401 on bad creds); `POST /api/auth/logout` → clears cookies, 204; `GET /api/auth/me` → the session user or 401; `POST /api/auth/refresh` → rotates + resets cookies, or 401.

- [ ] **Step 1: Write the failing login-route test**

Create `frontend/app/api/auth/login/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = { set: vi.fn(), get: vi.fn(), delete: vi.fn() };
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => store) }));

import { POST } from './route';

describe('POST /api/auth/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets cookies and returns the user on success', async () => {
    const user = { id: 'u1', email: 'admin@wallet.local', role: 'super_admin' };
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ user, tokens: { accessToken: 'a', refreshToken: 'r' } }), { status: 200 }),
    ) as unknown as typeof fetch;

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@wallet.local', password: 'ChangeMe123!' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(user);
    expect(store.set).toHaveBeenCalledWith('access_token', 'a', expect.objectContaining({ httpOnly: true }));
  });

  it('returns 401 and sets no cookies on bad credentials', async () => {
    global.fetch = vi.fn(async () => new Response('nope', { status: 401 })) as unknown as typeof fetch;
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@wallet.local', password: 'wrong' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(store.set).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx vitest run app/api/auth/login/route.test.ts`
Expected: FAIL — route not found.

- [ ] **Step 3: Implement the login handler**

Create `frontend/app/api/auth/login/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { setAuthCookies } from '@/lib/auth/session';
import { SessionUser } from '@/lib/auth/cookie-names';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3100';

export async function POST(request: Request) {
  const body = await request.json();
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const data = (await res.json()) as {
    user: SessionUser;
    tokens: { accessToken: string; refreshToken: string };
  };
  await setAuthCookies(data.user, data.tokens);
  return NextResponse.json(data.user);
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `cd frontend && npx vitest run app/api/auth/login/route.test.ts`
Expected: PASS (2 specs).

- [ ] **Step 5: Implement logout, me, refresh handlers**

Create `frontend/app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearAuthCookies } from '@/lib/auth/session';
import { REFRESH_COOKIE } from '@/lib/auth/cookie-names';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3100';

export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    }).catch(() => undefined); // best-effort revoke; always clear cookies below
  }
  await clearAuthCookies();
  return new NextResponse(null, { status: 204 });
}
```

Create `frontend/app/api/auth/me/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  return NextResponse.json(user);
}
```

Create `frontend/app/api/auth/refresh/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { refreshAuthCookies, clearAuthCookies } from '@/lib/auth/session';
import { REFRESH_COOKIE } from '@/lib/auth/cookie-names';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3100';

export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return NextResponse.json({ error: 'No session' }, { status: 401 });

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });
  if (!res.ok) {
    await clearAuthCookies();
    return NextResponse.json({ error: 'Refresh failed' }, { status: 401 });
  }
  const tokens = (await res.json()) as { accessToken: string; refreshToken: string };
  await refreshAuthCookies(tokens);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: all specs PASS (permissions 4, session 5, login route 2 = 11).

- [ ] **Step 7: Commit**

```bash
cd .. && git add frontend/app/api/auth
git commit -m "feat(frontend): add BFF auth route handlers (Milestone 6a, Task 5)"
```

---

## Task 6: Middleware route guard

**Files:**
- Create: `frontend/middleware.ts`
- Test: `frontend/middleware.test.ts`

**Interfaces:**
- Consumes: `SESSION_USER_COOKIE`.
- Produces: `middleware(request: NextRequest)` — redirects to `/login` when the `session_user` cookie is absent on a matched protected route; otherwise passes through. `config.matcher` covers `/` and the four sections.

- [ ] **Step 1: Write the failing test**

Create `frontend/middleware.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

function reqTo(path: string, withSession: boolean): NextRequest {
  const req = new NextRequest(new URL(`http://localhost:3200${path}`));
  if (withSession) req.cookies.set('session_user', JSON.stringify({ id: 'u1', email: 'a', role: 'admin' }));
  return req;
}

describe('middleware', () => {
  it('redirects to /login when no session cookie', () => {
    const res = middleware(reqTo('/', false));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('passes through when the session cookie is present', () => {
    const res = middleware(reqTo('/', true));
    // NextResponse.next() carries no redirect location.
    expect(res.headers.get('location')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx vitest run middleware.test.ts`
Expected: FAIL — middleware not found.

- [ ] **Step 3: Implement the middleware**

Create `frontend/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_USER_COOKIE } from '@/lib/auth/cookie-names';

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_USER_COOKIE);
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Guard the dashboard routes only; /login and /api/* are intentionally excluded.
export const config = {
  matcher: ['/', '/approvals/:path*', '/wallets/:path*', '/users/:path*', '/audit/:path*'],
};
```

- [ ] **Step 4: Run it and watch it pass**

Run: `cd frontend && npx vitest run middleware.test.ts`
Expected: PASS (2 specs).

- [ ] **Step 5: Commit**

```bash
cd .. && git add frontend/middleware.ts frontend/middleware.test.ts
git commit -m "feat(frontend): add auth-presence route middleware (Milestone 6a, Task 6)"
```

---

## Task 7: Login page

**Files:**
- Create: `frontend/app/login/page.tsx`
- Test: `frontend/app/login/page.test.tsx`

**Interfaces:**
- Consumes: `/api/auth/login`, `next/navigation` `useRouter`, shadcn `Button`/`Input`/`Label`/`Card`, react-hook-form + zod.
- Produces: `LoginPage` (client component) at `/login`; on success `router.push('/')`; on 401 shows an inline generic error.

- [ ] **Step 1: Write the failing test**

Create `frontend/app/login/page.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import LoginPage from './page';

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks());

  async function fillAndSubmit() {
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@wallet.local');
    await userEvent.type(screen.getByLabelText(/password/i), 'ChangeMe123!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  }

  it('redirects to / on success', async () => {
    global.fetch = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch;
    render(<LoginPage />);
    await fillAndSubmit();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
  });

  it('shows a generic error on 401', async () => {
    global.fetch = vi.fn(async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;
    render(<LoginPage />);
    await fillAndSubmit();
    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx vitest run app/login/page.test.tsx`
Expected: FAIL — page not found.

- [ ] **Step 3: Implement the login page**

Create `frontend/app/login/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      router.push('/');
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-4 text-xl font-semibold">Wallet Console</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="username" {...register('email')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Install the zod resolver if missing**

Run: `cd frontend && npm install react-hook-form @hookform/resolvers zod`

- [ ] **Step 5: Run it and watch it pass**

Run: `cd frontend && npx vitest run app/login/page.test.tsx`
Expected: PASS (2 specs).

- [ ] **Step 6: Commit**

```bash
cd .. && git add frontend/app/login frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): add login page (Milestone 6a, Task 7)"
```

---

## Task 8: Protected shell, dashboard, gated placeholders + live proof

**Files:**
- Create: `frontend/components/nav.tsx`
- Create: `frontend/components/topbar.tsx`
- Create: `frontend/app/(dashboard)/layout.tsx`
- Create: `frontend/app/(dashboard)/page.tsx`
- Create: `frontend/app/(dashboard)/{approvals,wallets,users,audit}/page.tsx`
- Modify: `frontend/app/page.tsx` (delete — replaced by the dashboard group's `page.tsx`)
- Test: `frontend/components/nav.test.tsx`

**Interfaces:**
- Consumes: `getSessionUser`, `roleHasPermission`, `Permission`, `next/navigation` (`redirect`, `usePathname`, `useRouter`).
- Produces: the protected shell at `/` hosting the dashboard + four permission-gated placeholder routes; `Nav` renders only permitted links; `Topbar` logs out and returns to `/login`.

- [ ] **Step 1: Write the failing nav-gating test**

Create `frontend/components/nav.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

import { Nav } from './nav';

describe('Nav gating', () => {
  it('shows only Wallets for support', () => {
    render(<Nav role="support" />);
    expect(screen.getByRole('link', { name: /wallets/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /users/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /approvals/i })).toBeNull();
  });

  it('shows every section for super_admin', () => {
    render(<Nav role="super_admin" />);
    for (const label of ['Approvals', 'Wallets', 'Users', 'Audit']) {
      expect(screen.getByRole('link', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
  });

  it('shows no section links for a plain user', () => {
    render(<Nav role="user" />);
    for (const label of ['Approvals', 'Wallets', 'Users', 'Audit']) {
      expect(screen.queryByRole('link', { name: new RegExp(label, 'i') })).toBeNull();
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx vitest run components/nav.test.tsx`
Expected: FAIL — Nav not found.

- [ ] **Step 3: Implement Nav (client, role-aware)**

Create `frontend/components/nav.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Permission, roleHasPermission } from '@/lib/auth/permissions';

interface NavItem {
  label: string;
  href: string;
  anyOf: Permission[];
}

const NAV: NavItem[] = [
  { label: 'Approvals', href: '/approvals', anyOf: ['deposit.approve', 'withdrawal.approve'] },
  { label: 'Wallets', href: '/wallets', anyOf: ['transaction.view_all'] },
  { label: 'Users', href: '/users', anyOf: ['user.manage'] },
  { label: 'Audit', href: '/audit', anyOf: ['audit.view'] },
];

export function Nav({ role }: { role: string }) {
  const pathname = usePathname();
  const visible = NAV.filter((item) => item.anyOf.some((p) => roleHasPermission(role, p)));

  return (
    <nav className="flex flex-col gap-1 p-3">
      <Link href="/" className={`rounded px-3 py-2 text-sm ${pathname === '/' ? 'bg-muted font-medium' : ''}`}>
        Dashboard
      </Link>
      {visible.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded px-3 py-2 text-sm ${pathname.startsWith(item.href) ? 'bg-muted font-medium' : ''}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `cd frontend && npx vitest run components/nav.test.tsx`
Expected: PASS (3 specs).

- [ ] **Step 5: Implement Topbar (client, logout)**

Create `frontend/components/topbar.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function Topbar({ email }: { email: string }) {
  const router = useRouter();
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };
  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <span className="font-semibold">Wallet Console</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{email}</span>
        <Button variant="outline" size="sm" onClick={logout}>
          Log out
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Implement the protected shell layout**

Create `frontend/app/(dashboard)/layout.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { Nav } from '@/components/nav';
import { Topbar } from '@/components/topbar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <div className="flex h-screen flex-col">
      <Topbar email={user.email} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 border-r">
          <Nav role={user.role} />
        </aside>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Implement the dashboard + gated placeholders**

Create `frontend/app/(dashboard)/page.tsx`:

```tsx
import { getSessionUser } from '@/lib/auth/session';

export default async function DashboardPage() {
  const user = await getSessionUser();
  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">Dashboard</h2>
      <p className="text-sm text-muted-foreground">
        Signed in as <strong>{user?.email}</strong> ({user?.role}).
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Select a section on the left. Feature screens arrive in Milestones 6b–6d.
      </p>
    </div>
  );
}
```

Create a shared gated placeholder — `frontend/components/gated-placeholder.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { Permission, roleHasPermission } from '@/lib/auth/permissions';

export async function GatedPlaceholder({ title, anyOf }: { title: string; anyOf: Permission[] }) {
  const user = await getSessionUser();
  if (!user || !anyOf.some((p) => roleHasPermission(user.role, p))) redirect('/');
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">Built in a later milestone.</p>
    </div>
  );
}
```

Create the four pages:

`frontend/app/(dashboard)/approvals/page.tsx`:
```tsx
import { GatedPlaceholder } from '@/components/gated-placeholder';
export default function Page() {
  return <GatedPlaceholder title="Approvals" anyOf={['deposit.approve', 'withdrawal.approve']} />;
}
```

`frontend/app/(dashboard)/wallets/page.tsx`:
```tsx
import { GatedPlaceholder } from '@/components/gated-placeholder';
export default function Page() {
  return <GatedPlaceholder title="Wallets" anyOf={['transaction.view_all']} />;
}
```

`frontend/app/(dashboard)/users/page.tsx`:
```tsx
import { GatedPlaceholder } from '@/components/gated-placeholder';
export default function Page() {
  return <GatedPlaceholder title="Users" anyOf={['user.manage']} />;
}
```

`frontend/app/(dashboard)/audit/page.tsx`:
```tsx
import { GatedPlaceholder } from '@/components/gated-placeholder';
export default function Page() {
  return <GatedPlaceholder title="Audit" anyOf={['audit.view']} />;
}
```

- [ ] **Step 8: Remove the scaffold's default home page**

Delete `frontend/app/page.tsx` (the dashboard group's `(dashboard)/page.tsx` now owns `/`). Keep `frontend/app/layout.tsx` (the root layout) as generated.

- [ ] **Step 9: Run the full frontend suite + build**

Run: `cd frontend && npm test && npm run build`
Expected: all specs PASS (permissions 4, session 5, login route 2, middleware 2, login page 2, nav 3 = 18); build succeeds.

- [ ] **Step 10: Live end-to-end proof**

1. Ensure Postgres is up + seeded (`docker compose up -d`; `cd backend && npm run prisma:seed` if needed).
2. Start the API: `cd backend && PORT=3100 npm run start:dev` (background shell).
3. Start the app: `cd frontend && npm run dev` (background shell) → open `http://localhost:3200`.
4. Verify by hand:
   - Visiting `http://localhost:3200/` while logged out → redirected to `/login`.
   - Log in with `admin@wallet.local` / `ChangeMe123!` → lands on the dashboard; sidebar shows **all four** sections (super_admin); topbar shows the email.
   - Wrong password → inline "Invalid email or password"; no navigation.
   - DevTools → Application → Cookies (`localhost:3200`): `access_token`, `refresh_token`, `session_user` present; the token cookies are **HttpOnly**; `document.cookie` in the console does NOT expose the tokens.
   - Click **Log out** → returns to `/login`; revisiting `/` redirects to `/login`.
5. Stop both background servers.

- [ ] **Step 11: Commit**

```bash
cd .. && git add frontend/app frontend/components && git rm frontend/app/page.tsx 2>/dev/null; git add -A frontend
git commit -m "feat(frontend): role-aware protected shell + gated routes (Milestone 6a, Task 8)"
```

---

## Self-Review notes (already applied)

- **Spec coverage:** backend token API (Task 1) ↔ §5; scaffold+shadcn+Vitest (Task 2) ↔ §3; permissions map (Task 3) ↔ §8; session cookies (Task 4) + BFF handlers (Task 5) ↔ §4/§7; middleware (Task 6) ↔ §7; login page (Task 7) ↔ §6/§9; shell + gated routes (Task 8) ↔ §6/§8. Playwright deferred (§2/§10). **`lib/api/server.ts` (silent-refresh fetch wrapper) is deferred to 6b** — no 6a domain call exercises it; the `/api/auth/refresh` handler mechanism is built in Task 5. Middleware does auth-presence only; auto-refresh-on-expiry lands in 6b with the first data screen.
- **Type consistency:** `SessionUser {id,email,role}` used across cookie-names, session, login route, layout, dashboard; `Permission` union + `roleHasPermission`/`permissionsForRole` consistent Tasks 3→8; cookie names `access_token`/`refresh_token`/`session_user` consistent Tasks 4→6.
- **Placeholder scan:** no TBD/TODO; every code step carries real code. The only manual fallback is Task 1 Step 6's token copy if the `json` CLI is absent — spelled out, not hand-waved.
