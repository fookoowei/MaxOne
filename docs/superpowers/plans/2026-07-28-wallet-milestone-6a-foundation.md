# Milestone 6a — Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up an Angular staff back-office console foundation — httpOnly-cookie auth against NestJS, plus a role-aware, protected application shell reachable only after login.

**Architecture:** Angular is a pure client-side SPA served on `:4200`; its dev-server proxy forwards `/api/*` to NestJS on `:3100`, so the browser sees a single origin and auth cookies are first-party (`SameSite=Lax`). NestJS sets/reads `httpOnly` access & refresh cookies — tokens never touch JavaScript. An HTTP interceptor sends credentials and silently refreshes on 401; functional route guards gate access by authentication and by a client-side role→permission map that mirrors the seed.

**Tech Stack:** Angular (standalone components) + Angular Material + RxJS/signals + Reactive Forms; NestJS + `cookie-parser`; Jasmine/Karma (frontend), Jest (backend).

## Global Constraints

- **Backend dev port:** NestJS runs with `PORT=3100` (port 3000 is taken by an unrelated container). The Angular proxy targets `http://localhost:3100`.
- **Cookie flags:** `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, and `secure` gated on `process.env.NODE_ENV === 'production'` (MUST be `false` in dev or the browser drops the cookie over plain `http://localhost`).
- **Cookie names:** `access_token`, `refresh_token`.
- **Access-token cookie maxAge:** `15 * 60 * 1000` (15 min). **Refresh-token cookie maxAge:** `7 * 24 * 60 * 60 * 1000` (7 days, matches `REFRESH_TTL_DAYS`).
- **Client gating is UX-only.** The backend still enforces every request; the frontend permission map only decides what to render.
- **DB reset caveat:** if the DB is reset, re-seed with `npm run prisma:seed` (this repo has no auto-seed hook).
- **Seeded login for proofs:** `admin@wallet.local` / `ChangeMe123!` (role `super_admin`).

---

## File Structure

**Backend (modified):**
- `backend/src/main.ts` — add `cookie-parser`.
- `backend/src/auth/auth.service.ts` — `login()` returns `{ user, tokens }`.
- `backend/src/auth/auth.controller.ts` — set/clear cookies; read refresh from cookie.
- `backend/src/auth/jwt.strategy.ts` — extract JWT from the `access_token` cookie (Bearer fallback).
- `backend/src/auth/auth.service.spec.ts` — update the one login-return assertion.

**Frontend (created under `frontend/`):**
- `proxy.conf.json` — `/api` → `:3100`.
- `src/app/core/auth/permissions.ts` — role→permission map + `roleHasPermission()`, `permissionsForRole()`.
- `src/app/core/auth/auth.service.ts` — `login/logout/loadCurrentUser/refresh` + `currentUser` signal.
- `src/app/core/auth/credentials.interceptor.ts` — `withCredentials` + 401→refresh→retry.
- `src/app/core/auth/auth.guard.ts` — `authGuard`, `requirePermission()`.
- `src/app/features/login/login.component.ts` — reactive-form login.
- `src/app/features/dashboard/dashboard.component.ts` — placeholder landing.
- `src/app/layout/shell.component.ts` — sidebar + topbar, role-aware nav, logout.
- `src/app/app.routes.ts`, `src/app/app.config.ts` — wiring.

---

## Task 1: Backend — httpOnly-cookie auth

**Files:**
- Modify: `backend/src/auth/auth.service.ts` (login return shape)
- Modify: `backend/src/auth/auth.controller.ts` (cookies)
- Modify: `backend/src/auth/jwt.strategy.ts` (cookie extractor)
- Modify: `backend/src/main.ts` (cookie-parser)
- Test: `backend/src/auth/auth.service.spec.ts` (update assertion)

**Interfaces:**
- Consumes: `TokensService.issueTokens(user) → { accessToken, refreshToken }`, `TokensService.rotate(raw) → { accessToken, refreshToken }`, `TokensService.revoke(raw)`.
- Produces: `POST /auth/login` sets both cookies and returns `{ id, email, role }`. `GET /auth/me` authenticates from the `access_token` cookie. `POST /auth/refresh` reads the `refresh_token` cookie, rotates, resets cookies. `POST /auth/logout` revokes + clears cookies.

- [ ] **Step 1: Install cookie-parser**

Run: `cd backend && npm install cookie-parser && npm install -D @types/cookie-parser`

- [ ] **Step 2: Wire cookie-parser in main.ts**

Modify `backend/src/main.ts` — add the import and `app.use(cookieParser())` right after the audit middleware:

```typescript
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { auditContextMiddleware } from './audit/audit.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(auditContextMiddleware);
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- [ ] **Step 3: Update the failing login-return test**

In `backend/src/auth/auth.service.spec.ts`, replace the assertion at the "issues tokens when the email exists and the password matches" test (currently line ~102):

```typescript
    // Returns the safe user AND the token pair.
    expect(result).toEqual({
      user: { id: 'user-1', email: credentials.email, role: 'user' },
      tokens: { accessToken: 'a.jwt', refreshToken: 'r-opaque' },
    });
    // The factory was handed the found user (so tokens carry the right identity/role).
    expect(tokensMock.issueTokens).toHaveBeenCalledWith(foundUser);
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd backend && npx jest src/auth/auth.service.spec.ts -t "issues tokens"`
Expected: FAIL — `result` is still `{ accessToken, refreshToken }`, missing the `user` wrapper.

- [ ] **Step 5: Change login() to return `{ user, tokens }`**

In `backend/src/auth/auth.service.ts`, replace the final line of `login()`:

```typescript
    if (!user || !passwordMatches) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.tokens.issueTokens(user);
    return {
      user: { id: user.id, email: user.email, role: user.role.name },
      tokens,
    };
  }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd backend && npx jest src/auth/auth.service.spec.ts -t "issues tokens"`
Expected: PASS.

- [ ] **Step 7: Set cookies in the controller**

Rewrite `backend/src/auth/auth.controller.ts`:

```typescript
import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthUser } from './jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type TokenPair = { accessToken: string; refreshToken: string };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokensService: TokensService,
  ) {}

  private setAuthCookies(res: Response, tokens: TokenPair): void {
    const secure = process.env.NODE_ENV === 'production';
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.authService.login(dto);
    this.setAuthCookies(res, tokens);
    return user;
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') bodyToken?: string,
  ) {
    const raw = (req.cookies?.['refresh_token'] as string | undefined) ?? bodyToken;
    const tokens = await this.tokensService.rotate(raw ?? '');
    this.setAuthCookies(res, tokens);
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') bodyToken?: string,
  ): Promise<void> {
    const raw = (req.cookies?.['refresh_token'] as string | undefined) ?? bodyToken;
    if (raw) await this.tokensService.revoke(raw);
    this.clearAuthCookies(res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
```

- [ ] **Step 8: Read the JWT from the cookie**

In `backend/src/auth/jwt.strategy.ts`, replace the `jwtFromRequest` line with a cookie-first extractor (add the `Request` import):

```typescript
import type { Request } from 'express';
// ...
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => (req?.cookies?.['access_token'] as string | undefined) ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
```

- [ ] **Step 9: Run the full backend suite**

Run: `cd backend && npx jest`
Expected: all suites PASS (85 tests: the updated login assertion is green; no other suite depends on the login return shape).

- [ ] **Step 10: Manual cookie proof**

Start the DB and API (`docker compose up -d` from repo root if needed; then `cd backend && PORT=3100 npm run start:dev` in a background shell). Then:

```bash
curl -i -s -X POST http://localhost:3100/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@wallet.local","password":"ChangeMe123!"}' | grep -i 'set-cookie\|^{'
```
Expected: two `Set-Cookie:` headers (`access_token=…; HttpOnly; SameSite=Lax`, `refresh_token=…; HttpOnly; SameSite=Lax`) and a JSON body `{"id":"…","email":"admin@wallet.local","role":"super_admin"}`. Then confirm the cookie authenticates `/auth/me`:

```bash
curl -s -c /tmp/jar -X POST http://localhost:3100/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@wallet.local","password":"ChangeMe123!"}' >/dev/null
curl -s -b /tmp/jar http://localhost:3100/auth/me
```
Expected: `{"id":"…","email":"admin@wallet.local","role":"super_admin"}`. Stop the dev server afterward.

- [ ] **Step 11: Commit**

```bash
git add backend/src/main.ts backend/src/auth/auth.service.ts backend/src/auth/auth.controller.ts backend/src/auth/jwt.strategy.ts backend/src/auth/auth.service.spec.ts backend/package.json backend/package-lock.json
git commit -m "feat(auth): issue JWTs as httpOnly cookies (Milestone 6a, Task 1)"
```

---

## Task 2: Scaffold the Angular app + Material + proxy

**Files:**
- Create: `frontend/` (Angular CLI workspace)
- Create: `frontend/proxy.conf.json`
- Modify: `frontend/angular.json` (wire the proxy into `serve`)

**Interfaces:**
- Produces: a buildable Angular app at `frontend/`; `ng serve` proxies `/api/*` to `:3100`; `ng test` runs headless.

- [ ] **Step 1: Generate the workspace**

From the repo root:

```bash
npx -p @angular/cli@latest ng new frontend --style=scss --ssr=false --skip-git --package-manager=npm
```
Accept defaults. This creates a standalone-component app with `app.config.ts` and `app.routes.ts`.

- [ ] **Step 2: Add Angular Material**

```bash
cd frontend && npx ng add @angular/material --skip-confirmation
```
Accept a prebuilt theme (e.g. Azure/Blue), set global typography = yes, animations = yes.

- [ ] **Step 3: Create the dev proxy**

Create `frontend/proxy.conf.json`:

```json
{
  "/api": {
    "target": "http://localhost:3100",
    "secure": false,
    "changeOrigin": true,
    "pathRewrite": { "^/api": "" }
  }
}
```

- [ ] **Step 4: Wire the proxy into `serve`**

In `frontend/angular.json`, under `projects.frontend.architect.serve.options`, add:

```json
"proxyConfig": "proxy.conf.json"
```

- [ ] **Step 5: Configure headless tests**

In `frontend/angular.json`, under `projects.frontend.architect.test.options`, ensure Karma runs headless by adding a `karmaConfig` OR rely on the CLI default and always invoke tests with `--browsers=ChromeHeadless --watch=false`. Verify:

Run: `cd frontend && npx ng test --browsers=ChromeHeadless --watch=false`
Expected: the default `AppComponent` spec PASSES (build + test toolchain works).

- [ ] **Step 6: Verify the build**

Run: `cd frontend && npx ng build`
Expected: build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
cd .. && git add frontend .gitignore && git commit -m "chore(frontend): scaffold Angular app with Material and dev proxy (Milestone 6a, Task 2)"
```

---

## Task 3: Role → permission map

**Files:**
- Create: `frontend/src/app/core/auth/permissions.ts`
- Test: `frontend/src/app/core/auth/permissions.spec.ts`

**Interfaces:**
- Produces:
  - `type Permission = 'deposit.approve' | 'withdrawal.approve' | 'wallet.adjust' | 'user.manage' | 'audit.view' | 'transaction.view_all'`
  - `permissionsForRole(role: string): Permission[]`
  - `roleHasPermission(role: string, permission: Permission): boolean`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/core/auth/permissions.spec.ts`:

```typescript
import { permissionsForRole, roleHasPermission } from './permissions';

describe('permissions map', () => {
  it('gives super_admin every permission', () => {
    expect(permissionsForRole('super_admin')).toContain('user.manage');
    expect(permissionsForRole('super_admin')).toContain('audit.view');
    expect(permissionsForRole('super_admin').length).toBe(6);
  });

  it('gives finance approval + adjust permissions', () => {
    expect(roleHasPermission('finance', 'deposit.approve')).toBe(true);
    expect(roleHasPermission('finance', 'wallet.adjust')).toBe(true);
    expect(roleHasPermission('finance', 'user.manage')).toBe(false);
  });

  it('gives support only read', () => {
    expect(permissionsForRole('support')).toEqual(['transaction.view_all']);
  });

  it('gives a plain user nothing', () => {
    expect(permissionsForRole('user')).toEqual([]);
    expect(roleHasPermission('user', 'audit.view')).toBe(false);
  });

  it('treats an unknown role as no permissions', () => {
    expect(permissionsForRole('nope')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx ng test --include='**/permissions.spec.ts' --browsers=ChromeHeadless --watch=false`
Expected: FAIL — `permissions` module not found.

- [ ] **Step 3: Implement the map**

Create `frontend/src/app/core/auth/permissions.ts`:

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

Run: `cd frontend && npx ng test --include='**/permissions.spec.ts' --browsers=ChromeHeadless --watch=false`
Expected: PASS (5 specs).

- [ ] **Step 5: Commit**

```bash
cd .. && git add frontend/src/app/core/auth/permissions.ts frontend/src/app/core/auth/permissions.spec.ts
git commit -m "feat(frontend): add role→permission map mirroring the seed (Milestone 6a, Task 3)"
```

---

## Task 4: AuthService

**Files:**
- Create: `frontend/src/app/core/auth/auth.service.ts`
- Test: `frontend/src/app/core/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `HttpClient`; endpoints `/api/auth/{login,logout,refresh,me}`.
- Produces:
  - `interface CurrentUser { id: string; email: string; role: string }`
  - `AuthService.currentUser: Signal<CurrentUser | null>`
  - `login(email, password): Observable<CurrentUser>`
  - `logout(): Observable<void>`
  - `loadCurrentUser(): Observable<CurrentUser | null>` (calls `/api/auth/me`; maps 401 → `null`)
  - `refresh(): Observable<void>`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/core/auth/auth.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('stores the user on successful login', () => {
    const user = { id: 'u1', email: 'admin@wallet.local', role: 'super_admin' };
    service.login('admin@wallet.local', 'ChangeMe123!').subscribe();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush(user);
    expect(service.currentUser()).toEqual(user);
  });

  it('clears the user on logout', () => {
    const user = { id: 'u1', email: 'admin@wallet.local', role: 'super_admin' };
    service.login('a', 'b').subscribe();
    http.expectOne('/api/auth/login').flush(user);
    service.logout().subscribe();
    http.expectOne('/api/auth/logout').flush(null);
    expect(service.currentUser()).toBeNull();
  });

  it('maps a 401 from /me to null', () => {
    let result: unknown = 'unset';
    service.loadCurrentUser().subscribe((u) => (result = u));
    http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(result).toBeNull();
    expect(service.currentUser()).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx ng test --include='**/auth.service.spec.ts' --browsers=ChromeHeadless --watch=false`
Expected: FAIL — `AuthService` not found.

- [ ] **Step 3: Implement AuthService**

Create `frontend/src/app/core/auth/auth.service.ts`:

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';

export interface CurrentUser {
  id: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly user = signal<CurrentUser | null>(null);

  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);

  login(email: string, password: string): Observable<CurrentUser> {
    return this.http
      .post<CurrentUser>('/api/auth/login', { email, password }, { withCredentials: true })
      .pipe(tap((u) => this.user.set(u)));
  }

  logout(): Observable<void> {
    return this.http
      .post<void>('/api/auth/logout', {}, { withCredentials: true })
      .pipe(tap(() => this.user.set(null)));
  }

  loadCurrentUser(): Observable<CurrentUser | null> {
    return this.http.get<CurrentUser>('/api/auth/me', { withCredentials: true }).pipe(
      tap((u) => this.user.set(u)),
      catchError(() => {
        this.user.set(null);
        return of(null);
      }),
    );
  }

  refresh(): Observable<void> {
    return this.http.post<void>('/api/auth/refresh', {}, { withCredentials: true });
  }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `cd frontend && npx ng test --include='**/auth.service.spec.ts' --browsers=ChromeHeadless --watch=false`
Expected: PASS (3 specs).

- [ ] **Step 5: Commit**

```bash
cd .. && git add frontend/src/app/core/auth/auth.service.ts frontend/src/app/core/auth/auth.service.spec.ts
git commit -m "feat(frontend): add AuthService with current-user signal (Milestone 6a, Task 4)"
```

---

## Task 5: Credentials interceptor (withCredentials + silent refresh)

**Files:**
- Create: `frontend/src/app/core/auth/credentials.interceptor.ts`
- Test: `frontend/src/app/core/auth/credentials.interceptor.spec.ts`

**Interfaces:**
- Consumes: `AuthService.refresh()`.
- Produces: `credentialsInterceptor: HttpInterceptorFn` — attaches `withCredentials: true`; on a 401 (except for the auth endpoints themselves) calls `refresh()` once and retries the original request.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/core/auth/credentials.interceptor.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { credentialsInterceptor } from './credentials.interceptor';

describe('credentialsInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it('adds withCredentials to outgoing requests', () => {
    http.get('/api/wallets').subscribe();
    const req = ctrl.expectOne('/api/wallets');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('refreshes once and retries on 401', () => {
    let ok = false;
    http.get('/api/wallets').subscribe(() => (ok = true));

    ctrl.expectOne('/api/wallets').flush(null, { status: 401, statusText: 'Unauthorized' });
    ctrl.expectOne('/api/auth/refresh').flush({ ok: true }); // refresh succeeds
    ctrl.expectOne('/api/wallets').flush([]); // retry succeeds

    expect(ok).toBe(true);
  });

  it('does not loop when refresh itself 401s', () => {
    let errored = false;
    http.post('/api/auth/refresh', {}).subscribe({ error: () => (errored = true) });
    ctrl.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(errored).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx ng test --include='**/credentials.interceptor.spec.ts' --browsers=ChromeHeadless --watch=false`
Expected: FAIL — interceptor not found.

- [ ] **Step 3: Implement the interceptor**

Create `frontend/src/app/core/auth/credentials.interceptor.ts`:

```typescript
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// Requests to these paths must never trigger a refresh-and-retry (avoids loops).
const AUTH_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const withCreds = req.clone({ withCredentials: true });

  if (AUTH_PATHS.some((p) => withCreds.url.startsWith(p))) {
    return next(withCreds);
  }

  return next(withCreds).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);
      return auth.refresh().pipe(
        switchMap(() => next(withCreds)), // retry the original request once
        catchError((refreshErr) => throwError(() => refreshErr)),
      );
    }),
  );
};
```

- [ ] **Step 4: Run it and watch it pass**

Run: `cd frontend && npx ng test --include='**/credentials.interceptor.spec.ts' --browsers=ChromeHeadless --watch=false`
Expected: PASS (3 specs).

- [ ] **Step 5: Commit**

```bash
cd .. && git add frontend/src/app/core/auth/credentials.interceptor.ts frontend/src/app/core/auth/credentials.interceptor.spec.ts
git commit -m "feat(frontend): add credentials interceptor with silent refresh (Milestone 6a, Task 5)"
```

---

## Task 6: Route guards

**Files:**
- Create: `frontend/src/app/core/auth/auth.guard.ts`
- Test: `frontend/src/app/core/auth/auth.guard.spec.ts`

**Interfaces:**
- Consumes: `AuthService.currentUser()`, `AuthService.loadCurrentUser()`, `roleHasPermission()`, Angular `Router`.
- Produces:
  - `authGuard: CanActivateFn` — allows if a user is known or `/me` resolves one; else redirects to `/login`.
  - `requirePermission(permission: Permission): CanActivateFn` — allows if the current user's role holds the permission; else redirects to `/login`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/core/auth/auth.guard.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { runInInjectionContext, Injector } from '@angular/core';
import { authGuard, requirePermission } from './auth.guard';
import { AuthService } from './auth.service';

function runGuard(guard: any, auth: Partial<AuthService>) {
  const injector = TestBed.inject(Injector);
  TestBed.overrideProvider(AuthService, { useValue: auth });
  return runInInjectionContext(injector, () => guard({} as any, {} as any));
}

describe('authGuard', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('allows when a user is already loaded', async () => {
    const auth = { currentUser: () => ({ id: 'u1', email: 'a', role: 'admin' }) } as any;
    expect(await Promise.resolve(runGuard(authGuard, auth))).toBe(true);
  });

  it('redirects to /login when /me yields no user', async () => {
    const router = TestBed.inject(Router);
    const tree = router.parseUrl('/login');
    const auth = { currentUser: () => null, loadCurrentUser: () => of(null) } as any;
    const result = await firstValueOrValue(runGuard(authGuard, auth));
    expect(result.toString()).toBe(tree.toString());
  });
});

describe('requirePermission', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('allows a role that holds the permission', async () => {
    const auth = { currentUser: () => ({ id: 'u1', email: 'a', role: 'admin' }) } as any;
    const guard = requirePermission('user.manage');
    expect(await Promise.resolve(runGuard(guard, auth))).toBe(true);
  });

  it('redirects a role that lacks the permission', async () => {
    const router = TestBed.inject(Router);
    const auth = { currentUser: () => ({ id: 'u1', email: 'a', role: 'support' }) } as any;
    const guard = requirePermission('user.manage');
    const result = runGuard(guard, auth);
    expect(result.toString()).toBe(router.parseUrl('/login').toString());
  });
});

// Small helper: guards may return boolean, UrlTree, or Observable of them.
async function firstValueOrValue(v: any): Promise<any> {
  if (v && typeof v.subscribe === 'function') {
    return await new Promise((res) => v.subscribe((x: any) => res(x)));
  }
  return v;
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx ng test --include='**/auth.guard.spec.ts' --browsers=ChromeHeadless --watch=false`
Expected: FAIL — guard module not found.

- [ ] **Step 3: Implement the guards**

Create `frontend/src/app/core/auth/auth.guard.ts`:

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';
import { Permission, roleHasPermission } from './permissions';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.currentUser()) return true;

  // No user in memory (e.g. hard refresh) — ask the server via the cookie.
  return auth.loadCurrentUser().pipe(map((u) => (u ? true : router.parseUrl('/login'))));
};

export function requirePermission(permission: Permission): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.currentUser();
    if (user && roleHasPermission(user.role, permission)) return true;
    return router.parseUrl('/login');
  };
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `cd frontend && npx ng test --include='**/auth.guard.spec.ts' --browsers=ChromeHeadless --watch=false`
Expected: PASS (4 specs).

- [ ] **Step 5: Commit**

```bash
cd .. && git add frontend/src/app/core/auth/auth.guard.ts frontend/src/app/core/auth/auth.guard.spec.ts
git commit -m "feat(frontend): add auth + permission route guards (Milestone 6a, Task 6)"
```

---

## Task 7: Login component

**Files:**
- Create: `frontend/src/app/features/login/login.component.ts`
- Test: `frontend/src/app/features/login/login.component.spec.ts`

**Interfaces:**
- Consumes: `AuthService.login()`, `Router`, Angular Material (`MatCard`, `MatFormField`, `MatInput`, `MatButton`), Reactive Forms.
- Produces: `LoginComponent` at route `/login`; on success navigates to `/`; on 401 shows an inline generic error.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/features/login/login.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/auth/auth.service';

describe('LoginComponent', () => {
  function setup(auth: Partial<AuthService>) {
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), provideNoopAnimations(), { provide: AuthService, useValue: auth }],
    });
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('navigates to / on successful login', () => {
    const auth = { login: () => of({ id: 'u1', email: 'a', role: 'admin' }) } as any;
    const fixture = setup(auth);
    const router = TestBed.inject(Router);
    const nav = spyOn(router, 'navigateByUrl');
    const cmp = fixture.componentInstance;
    cmp.form.setValue({ email: 'admin@wallet.local', password: 'ChangeMe123!' });
    cmp.submit();
    expect(nav).toHaveBeenCalledWith('/');
  });

  it('shows a generic error on 401', () => {
    const err = new HttpErrorResponse({ status: 401 });
    const auth = { login: () => throwError(() => err) } as any;
    const fixture = setup(auth);
    const cmp = fixture.componentInstance;
    cmp.form.setValue({ email: 'admin@wallet.local', password: 'wrong' });
    cmp.submit();
    expect(cmp.error()).toBe('Invalid email or password');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && npx ng test --include='**/login.component.spec.ts' --browsers=ChromeHeadless --watch=false`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement the login component**

Create `frontend/src/app/features/login/login.component.ts`:

```typescript
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="login-wrap">
      <mat-card class="login-card">
        <h1>Wallet Console</h1>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="username" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="current-password" />
          </mat-form-field>
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-wrap { display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .login-card { width: 360px; padding: 24px; display: flex; flex-direction: column; gap: 8px; }
    form { display: flex; flex-direction: column; gap: 8px; }
    .error { color: var(--mat-sys-error, #b3261e); margin: 0 0 8px; }
  `],
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);
  readonly submitting = signal(false);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.error.set(null);
    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => {
        this.error.set('Invalid email or password');
        this.submitting.set(false);
      },
    });
  }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `cd frontend && npx ng test --include='**/login.component.spec.ts' --browsers=ChromeHeadless --watch=false`
Expected: PASS (2 specs).

- [ ] **Step 5: Commit**

```bash
cd .. && git add frontend/src/app/features/login
git commit -m "feat(frontend): add login page (Milestone 6a, Task 7)"
```

---

## Task 8: Shell, dashboard, routing wiring + live proof

**Files:**
- Create: `frontend/src/app/layout/shell.component.ts`
- Create: `frontend/src/app/features/dashboard/dashboard.component.ts`
- Modify: `frontend/src/app/app.routes.ts`
- Modify: `frontend/src/app/app.config.ts`
- Modify: `frontend/src/app/app.component.ts` (reduce to `<router-outlet/>`)
- Test: `frontend/src/app/layout/shell.component.spec.ts`

**Interfaces:**
- Consumes: `AuthService`, `authGuard`, `requirePermission()`, `permissionsForRole()`, Angular Material (`MatSidenav`, `MatToolbar`, `MatList`, `MatButton`, `MatIcon`), `RouterOutlet`, `RouterLink`.
- Produces: the protected app shell hosting `/` (dashboard) and permission-gated placeholder child routes; nav renders only permitted links; logout returns to `/login`.

- [ ] **Step 1: Register the interceptor and router providers**

Replace `frontend/src/app/app.config.ts`:

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { credentialsInterceptor } from './core/auth/credentials.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([credentialsInterceptor])),
  ],
};
```

- [ ] **Step 2: Reduce AppComponent to a router outlet**

Replace `frontend/src/app/app.component.ts`:

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {}
```

- [ ] **Step 3: Create the dashboard placeholder**

Create `frontend/src/app/features/dashboard/dashboard.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <h2>Dashboard</h2>
    <p>Signed in as <strong>{{ auth.currentUser()?.email }}</strong> ({{ auth.currentUser()?.role }}).</p>
    <p>Select a section from the left. Feature screens arrive in Milestones 6b–6d.</p>
  `,
})
export class DashboardComponent {
  readonly auth = inject(AuthService);
}
```

- [ ] **Step 4: Create the shell with role-aware nav**

Create `frontend/src/app/layout/shell.component.ts`:

```typescript
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../core/auth/auth.service';
import { Permission, roleHasPermission } from '../core/auth/permissions';

interface NavItem {
  label: string;
  path: string;
  anyOf: Permission[];
}

const NAV: NavItem[] = [
  { label: 'Approvals', path: '/approvals', anyOf: ['deposit.approve', 'withdrawal.approve'] },
  { label: 'Wallets', path: '/wallets', anyOf: ['transaction.view_all'] },
  { label: 'Users', path: '/users', anyOf: ['user.manage'] },
  { label: 'Audit', path: '/audit', anyOf: ['audit.view'] },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule, MatButtonModule,
  ],
  template: `
    <mat-toolbar color="primary">
      <span>Wallet Console</span>
      <span class="spacer"></span>
      <span class="who">{{ auth.currentUser()?.email }}</span>
      <button mat-button (click)="logout()">Log out</button>
    </mat-toolbar>
    <mat-sidenav-container class="shell">
      <mat-sidenav mode="side" opened>
        <mat-nav-list>
          <a mat-list-item routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Dashboard</a>
          @for (item of visibleNav(); track item.path) {
            <a mat-list-item [routerLink]="item.path" routerLinkActive="active">{{ item.label }}</a>
          }
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content class="content">
        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .spacer { flex: 1 1 auto; }
    .who { margin-right: 12px; opacity: 0.85; font-size: 0.9rem; }
    .shell { position: absolute; top: 64px; bottom: 0; left: 0; right: 0; }
    .content { padding: 24px; }
    .active { background: rgba(0,0,0,0.06); }
  `],
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly visibleNav = computed(() => {
    const role = this.auth.currentUser()?.role ?? '';
    return NAV.filter((item) => item.anyOf.some((p) => roleHasPermission(role, p)));
  });

  logout(): void {
    this.auth.logout().subscribe({ complete: () => this.router.navigateByUrl('/login') });
  }
}
```

- [ ] **Step 5: Wire the routes**

Replace `frontend/src/app/app.routes.ts`:

```typescript
import { Routes } from '@angular/router';
import { authGuard, requirePermission } from './core/auth/auth.guard';

// Placeholder standalone component for 6a — real screens land in 6b–6d.
import { Component } from '@angular/core';
@Component({ standalone: true, template: `<h2>Coming soon</h2><p>This section is built in a later milestone.</p>` })
export class PlaceholderComponent {}

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      { path: 'approvals', canActivate: [requirePermission('deposit.approve')], component: PlaceholderComponent },
      { path: 'wallets', canActivate: [requirePermission('transaction.view_all')], component: PlaceholderComponent },
      { path: 'users', canActivate: [requirePermission('user.manage')], component: PlaceholderComponent },
      { path: 'audit', canActivate: [requirePermission('audit.view')], component: PlaceholderComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
```

- [ ] **Step 6: Write the shell nav-gating test**

Create `frontend/src/app/layout/shell.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ShellComponent } from './shell.component';
import { AuthService } from '../core/auth/auth.service';

function setup(role: string) {
  const auth = { currentUser: () => ({ id: 'u1', email: 'a@b.c', role }), logout: () => ({ subscribe: () => {} }) } as any;
  TestBed.configureTestingModule({
    imports: [ShellComponent],
    providers: [provideRouter([]), provideNoopAnimations(), { provide: AuthService, useValue: auth }],
  });
  const fixture = TestBed.createComponent(ShellComponent);
  fixture.detectChanges();
  return fixture.componentInstance;
}

describe('ShellComponent nav gating', () => {
  it('shows only permitted links for support (read-only)', () => {
    const labels = setup('support').visibleNav().map((n) => n.label);
    expect(labels).toEqual(['Wallets']);
  });

  it('shows every link for super_admin', () => {
    const labels = setup('super_admin').visibleNav().map((n) => n.label);
    expect(labels).toEqual(['Approvals', 'Wallets', 'Users', 'Audit']);
  });

  it('shows nothing for a plain user', () => {
    expect(setup('user').visibleNav().length).toBe(0);
  });
});
```

- [ ] **Step 7: Run the full frontend suite**

Run: `cd frontend && npx ng test --browsers=ChromeHeadless --watch=false`
Expected: all specs PASS (permissions 5, auth.service 3, interceptor 3, guards 4, login 2, shell 3 = 20+).

- [ ] **Step 8: Build to confirm no template/route errors**

Run: `cd frontend && npx ng build`
Expected: build succeeds.

- [ ] **Step 9: Live end-to-end proof**

1. Ensure Postgres is up and seeded (`docker compose up -d`; `cd backend && npm run prisma:seed` if needed).
2. Start the API: `cd backend && PORT=3100 npm run start:dev` (background shell).
3. Start the app: `cd frontend && npx ng serve` (background shell), open `http://localhost:4200`.
4. Verify each by hand:
   - Visiting `http://localhost:4200/` while logged out → redirected to `/login`.
   - Log in with `admin@wallet.local` / `ChangeMe123!` → lands on the dashboard; sidebar shows **all four** sections (super_admin); topbar shows the email.
   - Wrong password → inline "Invalid email or password", no navigation.
   - In DevTools → Application → Cookies: `access_token` and `refresh_token` are present and marked **HttpOnly** (and NOT readable via `document.cookie` in the console).
   - Click **Log out** → returns to `/login`; revisiting `/` redirects to `/login` again.
5. Stop both background servers.

- [ ] **Step 10: Commit**

```bash
cd .. && git add frontend/src/app
git commit -m "feat(frontend): role-aware protected shell + routing (Milestone 6a, Task 8)"
```

---

## Self-Review notes (already applied)

- **Spec coverage:** cookie auth (Task 1) ↔ spec §5; scaffold+proxy (Task 2) ↔ §3/§4; permissions map (Task 3) ↔ §8; AuthService/interceptor/guards (Tasks 4–6) ↔ §7; login+shell (Tasks 7–8) ↔ §6/§8; error handling (Tasks 7–8) ↔ §9; testing per task ↔ §10. Playwright explicitly deferred (§2/§10) — no task, by design.
- **Type consistency:** `CurrentUser {id,email,role}` used identically across AuthService, guards, login, shell; `Permission` union and `roleHasPermission`/`permissionsForRole` names consistent Tasks 3→6→8; cookie names `access_token`/`refresh_token` consistent Task 1 ↔ interceptor/proof.
- **Placeholder scan:** no TBD/TODO; every code step carries real code.
