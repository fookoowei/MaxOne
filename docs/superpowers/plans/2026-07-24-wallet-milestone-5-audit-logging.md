# Milestone 5 — Audit Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended)
> or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`)
> syntax for tracking. Implements `../specs/2026-07-24-wallet-milestone-5-audit-logging-design.md`.

**Goal:** Every money movement and every privilege change writes a permanent record of **who did
what, to which entity, from where, and what changed** — written inside the *same* database
transaction as the change itself, so a state change without its audit entry is impossible.

**Architecture:** A new `AuditModule` owns `prisma.auditLog` exclusively. `AuditService.log(tx, entry)`
takes the caller's **transaction client**, so the audit INSERT joins the same atomic unit as the balance
update. Request metadata (`ipAddress`/`userAgent`) is captured at the HTTP edge by a functional
middleware into `AsyncLocalStorage` and read by `AuditService` deep in the stack — so services stay
transport-agnostic. Six call sites across `WalletsService` and `UsersService` are wired up; two of them
gain a `$transaction` they did not previously have.

**Tech Stack:** NestJS 11 (Express 5), Prisma 6 (`Json?` columns, `Prisma.TransactionClient`),
PostgreSQL 16, Node 24 `async_hooks.AsyncLocalStorage`, class-validator/class-transformer, Jest.

## Global Constraints

- **The audit entry is written INSIDE the same `$transaction` as the change it records.** `log()` must
  always be called with the transaction client `tx`, **never** with the root `this.prisma`. This is the
  milestone's central guarantee; a test at every call site asserts it.
- **`AuditModule` is the ONLY place `prisma.auditLog` is touched.** Verified by a boundary grep in Task 7.
- **`oldValue`/`newValue` carry changed fields ONLY** — never a full row. `User` rows contain
  `passwordHash`; a full snapshot would leak credentials into a table every `audit.view` holder can read.
- **Action values come from the `AuditAction` union**, never free-form strings.
- **An empty ALS store is not an error** — `ipAddress`/`userAgent` become `null`. Audit must never fail
  because network metadata is missing.
- **`user.role_change` records role NAMES, not ids** (`"finance" → "admin"` is readable in an incident).
- **A transfer is anchored to the SOURCE wallet** — one action by one actor is one audit row.
- Any type used in a **decorated signature** must use `import type` (TS1272). `AuthUser` is such a type.
- `npx tsc --noEmit` and `npm test` (run from `backend/`) are the source of truth, not editor squiggles.
- One conventional commit per task. The user pushes.
- **Postgres must be running** for migration steps (`docker compose up -d`). If the DB was ever reset,
  re-seed manually (`npm run prisma:seed`) — this repo has no `prisma.seed` hook.
- **Live proofs run on `PORT=3100`**, not 3000 — port 3000 is taken by an unrelated project container
  (`mplink-dashboard-1`). Do not stop that container.

---

## File structure changed in this milestone

```
backend/
├── prisma/
│   └── schema.prisma                 # MODIFIED: new AuditLog model
└── src/
    ├── main.ts                       # MODIFIED: app.use(auditContextMiddleware)
    ├── app.module.ts                 # MODIFIED: imports AuditModule
    ├── audit/
    │   ├── audit.actions.ts          # NEW: AuditAction / AuditEntityType unions
    │   ├── audit.context.ts          # NEW: AsyncLocalStorage instance + getAuditContext()
    │   ├── audit.middleware.ts       # NEW: functional middleware, captures ip/userAgent
    │   ├── audit.middleware.spec.ts  # NEW: 3 tests
    │   ├── audit.service.ts          # NEW: log() + findMany(); sole owner of prisma.auditLog
    │   ├── audit.service.spec.ts     # NEW: 6 tests (3 log, 3 findMany)
    │   ├── audit.controller.ts       # NEW: GET /audit-logs, audit.view gated
    │   ├── dto/audit-query.dto.ts    # NEW: filters + pagination
    │   └── audit.module.ts           # NEW: provides + exports AuditService
    ├── users/
    │   ├── users.service.ts          # MODIFIED: updateStatus/updateRole gain $transaction + audit
    │   ├── users.service.spec.ts     # MODIFIED: +2 tests, buildService gains an audit mock
    │   └── users.module.ts           # MODIFIED: imports AuditModule
    └── wallets/
        ├── wallets.service.ts        # MODIFIED: approve/reject/adjust/transfer audit
        ├── wallets.service.spec.ts   # MODIFIED: +4 tests, buildService gains an audit mock
        └── wallets.module.ts         # MODIFIED: imports AuditModule
```

Starting point: **8 suites / 69 tests** (M4c end state). Ending point: **10 suites / 84 tests**.

---

## Task 1: `AuditLog` schema + migration

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Interfaces:**
- Produces: the `AuditLog` model on the typed Prisma client (`prisma.auditLog`, `Prisma.AuditLogWhereInput`),
  consumed by Task 3 and Task 6.

- [ ] **Step 1: Baseline green.** A schema change is safest from a clean, passing state.

```bash
cd backend && npx tsc --noEmit && npm test
```
Expected: tsc silent; **8 suites, 69 tests** passing (M4c end state).

- [ ] **Step 2: Add the model.** Append to the end of `backend/prisma/schema.prisma`:

```prisma
// Append-only record of who did what. Written INSIDE the same transaction as the change it
// describes, so a state change can never exist without its audit entry.
model AuditLog {
  id          String   @id @default(uuid())
  // Plain String, deliberately NOT a foreign key: an FK would force either ON DELETE RESTRICT
  // (a user who ever acted can never be deleted) or ON DELETE CASCADE (deleting a user erases
  // their audit trail — exactly what an audit log exists to prevent). Audit outlives its subject.
  actorUserId String
  action      String   // closed set, see src/audit/audit.actions.ts
  entityType  String   // "transaction" | "wallet" | "user"
  entityId    String
  // Changed fields ONLY, never full rows: User rows carry passwordHash, and this table is
  // readable by every audit.view holder.
  oldValue    Json?
  newValue    Json?
  ipAddress   String?  // captured at the HTTP edge; null outside a request
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([actorUserId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

> **Note (deliberate):** three indexes matching the three real queries — *what did this actor do*,
> *what happened to this entity*, *what happened recently*. `Json?` maps to Postgres `jsonb`.

- [ ] **Step 3: Generate the migration.** Postgres must be up (`docker compose ps`; if the daemon is
      down, `open -a Docker` and wait).

```bash
cd backend && npm run prisma:migrate -- --name add_audit_log
```
Expected: a new folder `prisma/migrations/…_add_audit_log` containing `CREATE TABLE "AuditLog"` plus
three `CREATE INDEX` statements, and "Your database is now in sync with your schema." If it prompts to
reset, **stop** and investigate — do not reset (the dev DB holds demo data, and a reset needs a manual
re-seed).

- [ ] **Step 4: Verify.**

```bash
cd backend && npx tsc --noEmit && npm test
```
Expected: tsc silent; still **8 suites / 69 tests** (schema only, no new tests).

- [ ] **Step 5: Commit.**

```bash
git add backend/prisma
git commit -m "feat: add AuditLog model (Milestone 5, Task 1)"
```

---

## Task 2: Request context — `AsyncLocalStorage` + middleware — TDD

**Files:**
- Create: `backend/src/audit/audit.context.ts`
- Create: `backend/src/audit/audit.middleware.ts`
- Create: `backend/src/audit/audit.middleware.spec.ts`
- Modify: `backend/src/main.ts`

**Interfaces:**
- Produces: `getAuditContext(): AuditContext` where `interface AuditContext { ipAddress: string | null;
  userAgent: string | null }` — consumed by `AuditService.log` in Task 3.
- Produces: `auditContextMiddleware(req, res, next)` — a plain Express middleware registered in `main.ts`.
- Produces: `auditContext` (the `AsyncLocalStorage<AuditContext>` instance) — used directly by tests in
  Task 3 to simulate a request.

- [ ] **Step 1: Write the failing tests** at `backend/src/audit/audit.middleware.spec.ts`:

```typescript
import { auditContextMiddleware } from './audit.middleware';
import { getAuditContext } from './audit.context';

// A minimal stand-in for the parts of the Express Request we read.
const fakeReq = (ip: string | undefined, agent: string | undefined) =>
  ({ ip, get: () => agent }) as any;

describe('auditContextMiddleware', () => {
  it('makes the request ip and user-agent visible to downstream callers', () => {
    let seen: any;
    auditContextMiddleware(fakeReq('203.0.113.7', 'jest-agent'), {} as any, () => {
      seen = getAuditContext();
    });
    expect(seen).toEqual({ ipAddress: '203.0.113.7', userAgent: 'jest-agent' });
  });

  it('keeps the context across an async hop — the store follows the call chain', async () => {
    let seen: any;
    await new Promise<void>((resolve) => {
      auditContextMiddleware(fakeReq('203.0.113.7', 'jest-agent'), {} as any, async () => {
        await Promise.resolve(); // the service layer is async; the store must survive this
        seen = getAuditContext();
        resolve();
      });
    });
    expect(seen.ipAddress).toBe('203.0.113.7');
  });

  it('yields nulls outside any request rather than throwing', () => {
    // A job, a script, or a unit test has no HTTP context. Audit must still work.
    expect(getAuditContext()).toEqual({ ipAddress: null, userAgent: null });
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

```bash
cd backend && npm test -- audit.middleware
```
Expected: FAIL — cannot find module `./audit.middleware`.

- [ ] **Step 3: Create the context** at `backend/src/audit/audit.context.ts`:

```typescript
import { AsyncLocalStorage } from 'async_hooks';

/** What the HTTP edge captures for the audit trail. */
export interface AuditContext {
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Request-scoped storage. The middleware fills it at the edge; AuditService reads it deep in the
 * call stack — so WalletsService and UsersService never have to accept transport details they
 * have no business knowing about. This is the same mechanism behind correlation IDs and tracing.
 */
export const auditContext = new AsyncLocalStorage<AuditContext>();

/**
 * Never throws. Outside an HTTP request (a job, a script, a unit test) there is simply no
 * context, and an audit entry with a null IP is far better than a failed money movement.
 */
export function getAuditContext(): AuditContext {
  return auditContext.getStore() ?? { ipAddress: null, userAgent: null };
}
```

- [ ] **Step 4: Create the middleware** at `backend/src/audit/audit.middleware.ts`:

```typescript
import type { NextFunction, Request, Response } from 'express';
import { auditContext } from './audit.context';

/**
 * Establishes the request-scoped audit context.
 *
 * Middleware, not an interceptor: `als.run()` must wrap the *execution* of everything
 * downstream. An interceptor returns an Observable whose handler only runs on subscription —
 * after `run()` has already exited — so the store would be silently empty.
 *
 * A plain function, not an injectable NestMiddleware class: it has no dependencies (it only
 * writes to a module-level store), so DI would be ceremony. Registered with `app.use()` in
 * main.ts rather than `AppModule.configure()`, because NestJS 11 ships Express 5 whose
 * path-to-regexp v8 rejects the bare `forRoutes('*')` wildcard.
 */
export function auditContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  auditContext.run(
    { ipAddress: req.ip ?? null, userAgent: req.get('user-agent') ?? null },
    () => next(),
  );
}
```

- [ ] **Step 5: Run the tests — green.**

```bash
cd backend && npm test -- audit.middleware
```
Expected: **3 tests passing**.

- [ ] **Step 6: Register it globally.** In `backend/src/main.ts`, add the import and the `app.use` line
      **before** `app.useGlobalPipes(...)` so the context is established for every request:

```typescript
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { auditContextMiddleware } from './audit/audit.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // First in the chain: every downstream guard, controller and service runs inside the
  // request-scoped audit context.
  app.use(auditContextMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- [ ] **Step 7: Full suite + typecheck.**

```bash
cd backend && npx tsc --noEmit && npm test
```
Expected: tsc silent; **9 suites / 72 tests** (69 + 3).

- [ ] **Step 8: Commit.**

```bash
git add backend/src/audit backend/src/main.ts
git commit -m "feat: capture request context in AsyncLocalStorage (Milestone 5, Task 2)"
```

---

## Task 3: `AuditService.log` + `AuditModule` — TDD

**Files:**
- Create: `backend/src/audit/audit.actions.ts`
- Create: `backend/src/audit/audit.service.ts`
- Create: `backend/src/audit/audit.service.spec.ts`
- Create: `backend/src/audit/audit.module.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: `getAuditContext()` and `auditContext` (Task 2).
- Produces: `AuditService.log(tx: Prisma.TransactionClient, entry: AuditEntry): Promise<void>` where
  `AuditEntry = { actorUserId: string; action: AuditAction; entityType: AuditEntityType; entityId: string;
  oldValue: Prisma.InputJsonObject; newValue: Prisma.InputJsonObject }` — consumed by Tasks 4 and 5.
- Produces: `AuditAction` / `AuditEntityType` unions — consumed by Tasks 4, 5 and 6.
- Produces: `AuditModule` exporting `AuditService` — imported by `WalletsModule` (Task 4),
  `UsersModule` (Task 5) and `AppModule` (this task).

- [ ] **Step 1: Create the action union** at `backend/src/audit/audit.actions.ts`:

```typescript
/**
 * The closed set of audited actions. A union rather than free-form strings, so a typo is a
 * compile error and every audited action in the system is discoverable in one file.
 */
export type AuditAction =
  | 'deposit.approve'
  | 'deposit.reject'
  | 'withdrawal.approve'
  | 'withdrawal.reject'
  | 'wallet.adjust'
  | 'wallet.transfer'
  | 'user.status_change'
  | 'user.role_change';

export type AuditEntityType = 'transaction' | 'wallet' | 'user';
```

- [ ] **Step 2: Write the failing tests** at `backend/src/audit/audit.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { auditContext } from './audit.context';

function buildService(prismaMock: any) {
  return Test.createTestingModule({
    providers: [AuditService, { provide: PrismaService, useValue: prismaMock }],
  })
    .compile()
    .then((moduleRef) => moduleRef.get(AuditService));
}

const entry = {
  actorUserId: 'user-1',
  action: 'wallet.adjust' as const,
  entityType: 'wallet' as const,
  entityId: 'wallet-1',
  oldValue: { balance: 100 },
  newValue: { balance: 250 },
};

describe('AuditService.log', () => {
  it('writes the entry on the CALLER transaction client, never the root client', async () => {
    const tx = { auditLog: { create: jest.fn() } };
    const prisma = { auditLog: { create: jest.fn() } };
    const service = await buildService(prisma);

    await service.log(tx as any, entry);

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'user-1',
        action: 'wallet.adjust',
        entityType: 'wallet',
        entityId: 'wallet-1',
        oldValue: { balance: 100 },
        newValue: { balance: 250 },
      }),
    });
    // The atomicity guarantee: writing on the root client would land OUTSIDE the transaction.
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('stamps the ip and user-agent from the request context', async () => {
    const tx = { auditLog: { create: jest.fn() } };
    const service = await buildService({});

    await auditContext.run({ ipAddress: '203.0.113.7', userAgent: 'jest-agent' }, () =>
      service.log(tx as any, entry),
    );

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ ipAddress: '203.0.113.7', userAgent: 'jest-agent' }),
    });
  });

  it('records nulls when there is no request context, rather than failing', async () => {
    const tx = { auditLog: { create: jest.fn() } };
    const service = await buildService({});

    await service.log(tx as any, entry);

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ ipAddress: null, userAgent: null }),
    });
  });
});
```

- [ ] **Step 3: Run them and watch them fail.**

```bash
cd backend && npm test -- audit.service
```
Expected: FAIL — cannot find module `./audit.service`.

- [ ] **Step 4: Implement the service** at `backend/src/audit/audit.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getAuditContext } from './audit.context';
import type { AuditAction, AuditEntityType } from './audit.actions';

export interface AuditEntry {
  actorUserId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  /** Changed fields only — never a full row. See the spec §5. */
  oldValue: Prisma.InputJsonObject;
  newValue: Prisma.InputJsonObject;
}

/**
 * The only place `prisma.auditLog` is touched. Append-only by construction: there is no update
 * and no delete method, so no route can reach one.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes one audit row using the CALLER'S transaction client, so the entry lands in the same
   * transaction as the change it records: both commit, or neither does. Passing `this.prisma`
   * here instead of `tx` would silently break that guarantee — hence the test that asserts the
   * root client is never used.
   *
   * This is a local INSERT on a connection already held, costing microseconds — which is why it
   * belongs inside the transaction, while M4c's FX call (slow and external) had to stay outside.
   */
  async log(tx: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
    const { ipAddress, userAgent } = getAuditContext();
    await tx.auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        ipAddress,
        userAgent,
      },
    });
  }
}
```

- [ ] **Step 5: Create the module** at `backend/src/audit/audit.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';

@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
```

- [ ] **Step 6: Register it** in `backend/src/app.module.ts` — add the import and the entry in `imports`:

```typescript
import { AuditModule } from './audit/audit.module';
```
```typescript
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    PrismaModule,
    UsersModule,
    WalletsModule,
    HealthModule,
    AuthModule,
    AuditModule,
  ],
```

- [ ] **Step 7: Run the tests — green.**

```bash
cd backend && npm test -- audit.service
```
Expected: **3 tests passing**.

- [ ] **Step 8: Full suite + typecheck.**

```bash
cd backend && npx tsc --noEmit && npm test
```
Expected: tsc silent; **10 suites / 75 tests** (72 + 3).

- [ ] **Step 9: Commit.**

```bash
git add backend/src/audit backend/src/app.module.ts
git commit -m "feat: add AuditService.log writing inside the caller transaction (Milestone 5, Task 3)"
```

---

## Task 4: Audit the four money operations — TDD

**Files:**
- Modify: `backend/src/wallets/wallets.service.spec.ts`
- Modify: `backend/src/wallets/wallets.service.ts`
- Modify: `backend/src/wallets/wallets.module.ts`

**Interfaces:**
- Consumes: `AuditService.log`, `AuditAction` (Task 3); the existing `buildService`, `txPrisma`,
  `transferPrisma`, `wallet()`, `actor` helpers in the spec.
- Produces: `WalletsService.approve|reject|adjust|transfer` each write exactly one audit entry using
  the transaction client.

- [ ] **Step 1: Update the test harness.** In `backend/src/wallets/wallets.service.spec.ts`:

  **(a)** Add the import below the existing `RatesService` import:

```typescript
import { AuditService } from '../audit/audit.service';
```

  **(b)** Give `buildService` a fourth parameter providing an `AuditService` mock. Replace the existing
  `buildService` function with:

```typescript
function buildService(
  prismaMock: any,
  usersMock: any = { findByIdWithPermissions: jest.fn() },
  ratesMock: any = { getRate: jest.fn() },
  auditMock: any = { log: jest.fn() },
) {
  return Test.createTestingModule({
    providers: [
      WalletsService,
      { provide: PrismaService, useValue: prismaMock },
      { provide: UsersService, useValue: usersMock },
      { provide: RatesService, useValue: ratesMock },
      { provide: AuditService, useValue: auditMock },
    ],
  })
    .compile()
    .then((moduleRef) => moduleRef.get(WalletsService));
}
```

> Existing calls keep working — the new parameter is defaulted, and the default mock's `log` is a
> no-op jest fn.

  **(c)** Add the `auditLog` double to the two shared prisma-mock helpers so a real `log` would have
  somewhere to write. In `txPrisma`, no change is needed (it spreads `txDouble`). In `transferPrisma`,
  add `auditLog` to `txDouble`:

```typescript
  const txDouble = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    wallet: {
      findUnique: jest.fn(({ where }: any) => Promise.resolve(rows[where.id] ?? null)),
      update: jest.fn().mockResolvedValue(undefined),
    },
    transaction: {
      create: jest.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({ id: `txn-${data.type}`, ...data }),
      ),
    },
    auditLog: { create: jest.fn() },
  };
```

- [ ] **Step 2: Write the failing tests.** Append these four tests to
      `backend/src/wallets/wallets.service.spec.ts`:

```typescript
describe('WalletsService audit trail', () => {
  it('audits an approved withdrawal with the transaction client', async () => {
    const txDouble = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      transaction: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'txn-1', walletId: 'wallet-1', type: 'withdrawal', amount: 1000, status: 'pending',
        }),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'txn-1', ...data })),
      },
      wallet: {
        findUnique: jest.fn().mockResolvedValue(wallet({ id: 'wallet-1', balance: 5000 })),
        update: jest.fn().mockResolvedValue(undefined),
      },
      auditLog: { create: jest.fn() },
    };
    const prisma = txPrisma(txDouble);
    const audit = { log: jest.fn() };
    const users = {
      findByIdWithPermissions: jest.fn().mockResolvedValue({
        role: { permissions: [{ name: 'withdrawal.approve' }] },
      }),
    };
    const service = await buildService(prisma, users, undefined, audit);

    await service.approve('txn-1', actor);

    expect(audit.log).toHaveBeenCalledTimes(1);
    const [client, entry] = audit.log.mock.calls[0];
    expect(client).toBe(txDouble); // the transaction client, NOT the root prisma client
    expect(entry).toEqual({
      actorUserId: 'user-1',
      action: 'withdrawal.approve',
      entityType: 'transaction',
      entityId: 'txn-1',
      oldValue: { status: 'pending' },
      newValue: { status: 'approved', balanceAfter: 4000 },
    });
  });

  it('audits a rejected deposit with the note', async () => {
    const txDouble = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      transaction: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'txn-2', walletId: 'wallet-1', type: 'deposit', amount: 500, status: 'pending', note: null,
        }),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'txn-2', ...data })),
      },
      auditLog: { create: jest.fn() },
    };
    const prisma = txPrisma(txDouble);
    const audit = { log: jest.fn() };
    const users = {
      findByIdWithPermissions: jest.fn().mockResolvedValue({
        role: { permissions: [{ name: 'deposit.approve' }] },
      }),
    };
    const service = await buildService(prisma, users, undefined, audit);

    await service.reject('txn-2', actor, 'looks fraudulent');

    const [client, entry] = audit.log.mock.calls[0];
    expect(client).toBe(txDouble);
    expect(entry).toMatchObject({
      action: 'deposit.reject',
      entityType: 'transaction',
      entityId: 'txn-2',
      oldValue: { status: 'pending' },
      newValue: { status: 'rejected', note: 'looks fraudulent' },
    });
  });

  it('audits an adjustment with the balance before and after', async () => {
    const txDouble = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      wallet: {
        findUnique: jest.fn().mockResolvedValue(wallet({ id: 'wallet-1', balance: 100 })),
        update: jest.fn().mockResolvedValue(undefined),
      },
      transaction: {
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'txn-3', ...data })),
      },
      auditLog: { create: jest.fn() },
    };
    const prisma = txPrisma(txDouble);
    const audit = { log: jest.fn() };
    const service = await buildService(prisma, undefined, undefined, audit);

    await service.adjust('wallet-1', { direction: 'credit', amount: 150, note: 'goodwill' }, actor);

    const [client, entry] = audit.log.mock.calls[0];
    expect(client).toBe(txDouble);
    expect(entry).toEqual({
      actorUserId: 'user-1',
      action: 'wallet.adjust',
      entityType: 'wallet',
      entityId: 'wallet-1',
      oldValue: { balance: 100 },
      newValue: { balance: 250, direction: 'credit', amount: 150, note: 'goodwill' },
    });
  });

  it('audits a cross-currency transfer against the source wallet, with the rate as a string', async () => {
    const { txDouble, prisma } = transferPrisma({
      'wallet-2': wallet({ id: 'wallet-2', userId: 'user-2', balance: 100, currency: 'EUR' }),
    });
    const rates = { getRate: jest.fn().mockResolvedValue(new Prisma.Decimal('0.9')) };
    const audit = { log: jest.fn() };
    const service = await buildService(prisma, undefined, rates, audit);

    await service.transfer('wallet-1', actor, { toWalletId: 'wallet-2', amount: 1000 });

    expect(audit.log).toHaveBeenCalledTimes(1); // ONE row per action, anchored to the source
    const [client, entry] = audit.log.mock.calls[0];
    expect(client).toBe(txDouble);
    expect(entry).toEqual({
      actorUserId: 'user-1',
      action: 'wallet.transfer',
      entityType: 'wallet',
      entityId: 'wallet-1',
      oldValue: { balance: 5000 },
      newValue: {
        balance: 4000,
        toWalletId: 'wallet-2',
        amount: 1000,
        credit: 900,
        exchangeRate: '0.9', // Decimal stringified — JSON has no decimal type
      },
    });
  });
});
```

- [ ] **Step 3: Run them and watch them fail.**

```bash
cd backend && npm test -- wallets.service
```
Expected: FAIL — 4 failures, `audit.log` never called (`expect(jest.fn()).toHaveBeenCalledTimes(1)`
received 0).

- [ ] **Step 4: Implement.** Five edits in `backend/src/wallets/wallets.service.ts`.

  **(a)** Add two imports below the existing `RatesService` import:

```typescript
import { AuditService } from '../audit/audit.service';
import type { AuditAction } from '../audit/audit.actions';
```

  **(b)** Add `audit` to the constructor:

```typescript
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly rates: RatesService,
    private readonly audit: AuditService,
  ) {}
```

  **(c)** In `approve`, replace the closing `return tx.transaction.update({ … });` block with:

```typescript
      const updated = await tx.transaction.update({
        where: { id: txn.id },
        data: {
          status: 'approved',
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          balanceBefore: before,
          balanceAfter: after,
        },
      });

      // Same tx: the settlement and its audit entry commit together or not at all.
      // Explicit ternary rather than a template string, so the value is typed, not cast.
      const action: AuditAction =
        txn.type === 'withdrawal' ? 'withdrawal.approve' : 'deposit.approve';
      await this.audit.log(tx, {
        actorUserId: actor.id,
        action,
        entityType: 'transaction',
        entityId: txn.id,
        oldValue: { status: 'pending' },
        newValue: { status: 'approved', balanceAfter: after },
      });

      return updated;
```

  **(d)** In `reject`, replace the closing `return tx.transaction.update({ … });` block with:

```typescript
      const note_ = note ?? txn.note;
      const updated = await tx.transaction.update({
        where: { id: txn.id },
        data: {
          status: 'rejected',
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          note: note_,
        },
      });

      const action: AuditAction =
        txn.type === 'withdrawal' ? 'withdrawal.reject' : 'deposit.reject';
      await this.audit.log(tx, {
        actorUserId: actor.id,
        action,
        entityType: 'transaction',
        entityId: txn.id,
        oldValue: { status: 'pending' },
        newValue: { status: 'rejected', note: note_ },
      });

      return updated;
```

  **(e)** In `adjust`, replace the closing `return tx.transaction.create({ … });` block with:

```typescript
      const created = await tx.transaction.create({
        data: {
          walletId,
          type: 'adjustment',
          amount: dto.amount,
          balanceBefore: before,
          balanceAfter: after,
          status: 'approved',
          requestedBy: actor.id,
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          note: dto.note,
        },
      });

      // The control weakness accepted in M4a (requestedBy === reviewedBy) is mitigated here:
      // narrow permission + mandatory note + this audit entry.
      await this.audit.log(tx, {
        actorUserId: actor.id,
        action: 'wallet.adjust',
        entityType: 'wallet',
        entityId: walletId,
        oldValue: { balance: before },
        newValue: { balance: after, direction: dto.direction, amount: dto.amount, note: dto.note },
      });

      return created;
```

  **(f)** In `transfer`, insert the audit call immediately **before** the final `return outRow;`
  (after the second `tx.transaction.create`):

```typescript
      // Anchored to the SOURCE wallet: one action by one actor is one audit row. The
      // destination appears in newValue, and the ledger already links both halves by transferId.
      await this.audit.log(tx, {
        actorUserId: actor.id,
        action: 'wallet.transfer',
        entityType: 'wallet',
        entityId: from.id,
        oldValue: { balance: from.balance },
        newValue: {
          balance: fromAfter,
          toWalletId: to.id,
          amount: dto.amount,
          credit,
          // JSON has no decimal type; stringify so the rate survives round-tripping exactly.
          exchangeRate: exchangeRate ? exchangeRate.toString() : null,
        },
      });

      // Only the sender's row is returned: the receiver's row carries their balance,
      // which the sender has no right to see.
      return outRow;
```

  **(g)** In `backend/src/wallets/wallets.module.ts`, import `AuditModule` and add it to `imports`:

```typescript
import { AuditModule } from '../audit/audit.module';
```
```typescript
  imports: [UsersModule, RatesModule, AuditModule],
```

- [ ] **Step 5: Run the wallet tests — green.**

```bash
cd backend && npm test -- wallets.service
```
Expected: **39 tests passing** in `wallets.service` (35 from M4c + 4 new).

- [ ] **Step 6: Full suite + typecheck.**

```bash
cd backend && npx tsc --noEmit && npm test
```
Expected: tsc silent; **10 suites / 79 tests** (75 + 4).

- [ ] **Step 7: Commit.**

```bash
git add backend/src/wallets
git commit -m "feat: audit approve, reject, adjust and transfer (Milestone 5, Task 4)"
```

---

## Task 5: Audit the two user-management operations — TDD

**Files:**
- Modify: `backend/src/users/users.service.spec.ts`
- Modify: `backend/src/users/users.service.ts`
- Modify: `backend/src/users/users.module.ts`

**Interfaces:**
- Consumes: `AuditService.log` (Task 3); the existing `buildService`, `row()` helpers in the spec.
- Produces: `UsersService.updateStatus|updateRole` now run inside `prisma.$transaction` and write one
  audit entry each.

- [ ] **Step 1: Update the test harness.** In `backend/src/users/users.service.spec.ts`:

  **(a)** Add the import below the existing `AuthUser` import:

```typescript
import { AuditService } from '../audit/audit.service';
```

  **(b)** Give `buildService` a third parameter providing an `AuditService` mock. Replace the existing
  `buildService` function with:

```typescript
function buildService(
  prismaMock: any,
  rolesMock: any = { findByName: jest.fn().mockResolvedValue({ id: 'role-2', name: 'finance' }) },
  auditMock: any = { log: jest.fn() },
) {
  return Test.createTestingModule({
    providers: [
      UsersService,
      { provide: PrismaService, useValue: prismaMock },
      { provide: RolesService, useValue: rolesMock },
      { provide: AuditService, useValue: auditMock },
    ],
  })
    .compile()
    .then((moduleRef) => moduleRef.get(UsersService));
}
```

  **(c)** Existing `updateStatus`/`updateRole` tests pass a prisma mock shaped
  `{ user: { findUnique, update } }`. Those methods now open a transaction, so every such mock needs a
  `$transaction` that runs the callback against itself. Add this helper immediately below `buildService`:

```typescript
// updateStatus/updateRole now run inside a transaction (their audit entry must be atomic with
// the change). This wraps a plain mock so the callback receives the same double.
function txUsersPrisma(mock: any) {
  return { ...mock, $transaction: jest.fn().mockImplementation((cb: any) => cb(mock)) };
}
```

  **(d)** Wrap the prisma mock in **every existing `updateStatus` and `updateRole` test** with
  `txUsersPrisma(...)`, and add an `auditLog: { create: jest.fn() }` key to each. For example a test
  that currently reads:

```typescript
    const prismaMock = { user: { findUnique: jest.fn().mockResolvedValue(row('user-2')), update: jest.fn() } };
    const service = await buildService(prismaMock);
```
becomes:

```typescript
    const prismaMock = txUsersPrisma({
      user: { findUnique: jest.fn().mockResolvedValue(row('user-2')), update: jest.fn() },
      auditLog: { create: jest.fn() },
    });
    const service = await buildService(prismaMock);
```

> Tests asserting a **guard rejection** (self-status, self-role, non-super_admin assigning super_admin,
> unknown role, 404) throw *before* the transaction opens and need no change — but wrapping them is
> harmless and keeps the file uniform.

- [ ] **Step 2: Write the failing tests.** Append to `backend/src/users/users.service.spec.ts`:

```typescript
describe('UsersService audit trail', () => {
  it('audits a status change with the transaction client and the previous status', async () => {
    const inner = {
      user: {
        findUnique: jest.fn().mockResolvedValue(row('user-2')), // status: 'active'
        update: jest.fn().mockResolvedValue({ ...row('user-2'), status: 'suspended' }),
      },
      auditLog: { create: jest.fn() },
    };
    const prismaMock = txUsersPrisma(inner);
    const audit = { log: jest.fn() };
    const service = await buildService(prismaMock, undefined, audit);

    await service.updateStatus('user-2', 'suspended', admin);

    expect(audit.log).toHaveBeenCalledTimes(1);
    const [client, entry] = audit.log.mock.calls[0];
    expect(client).toBe(inner); // the transaction client
    expect(entry).toEqual({
      actorUserId: 'admin-1',
      action: 'user.status_change',
      entityType: 'user',
      entityId: 'user-2',
      oldValue: { status: 'active' },
      newValue: { status: 'suspended' },
    });
  });

  it('audits a role change using role NAMES, not ids', async () => {
    const inner = {
      user: {
        findUnique: jest.fn().mockResolvedValue(row('user-2')), // role: { name: 'user' }
        update: jest.fn().mockResolvedValue(row('user-2')),
      },
      auditLog: { create: jest.fn() },
    };
    const prismaMock = txUsersPrisma(inner);
    const audit = { log: jest.fn() };
    const service = await buildService(prismaMock, undefined, audit);

    await service.updateRole('user-2', 'finance', admin);

    const [client, entry] = audit.log.mock.calls[0];
    expect(client).toBe(inner);
    expect(entry).toEqual({
      actorUserId: 'admin-1',
      action: 'user.role_change',
      entityType: 'user',
      entityId: 'user-2',
      // Names, not UUIDs: "user" -> "finance" is readable during an incident.
      oldValue: { role: 'user' },
      newValue: { role: 'finance' },
    });
  });
});
```

> **Note the actor name:** unlike `wallets.service.spec.ts` (which uses `actor`), this file declares
> `const admin: AuthUser = { id: 'admin-1', … }` and `const superAdmin` near line 91. The tests above
> use `admin`, hence the expected `actorUserId: 'admin-1'`.

- [ ] **Step 3: Run them and watch them fail.**

```bash
cd backend && npm test -- users.service
```
Expected: FAIL — `audit.log` never called; some existing tests may also fail until Step 4 adds the
transaction (that is expected and is fixed by the same change).

- [ ] **Step 4: Implement.** Three edits in `backend/src/users/users.service.ts`.

  **(a)** Add the import below the existing `AuthUser` import:

```typescript
import { AuditService } from '../audit/audit.service';
```

  **(b)** Add `audit` to the constructor:

```typescript
  constructor(
    private readonly prisma: PrismaService,
    private readonly roles: RolesService,
    private readonly audit: AuditService,
  ) {}
```

  **(c)** Replace `updateStatus` and `updateRole` with the versions below. The changes: the previously
  discarded `findById` result is now captured as the "before" state, and the update plus its audit entry
  run inside one transaction.

```typescript
  async updateStatus(id: string, status: 'active' | 'suspended', actor: AuthUser) {
    // Self-lockout guard: suspending yourself is never intentional.
    if (id === actor.id) throw new ForbiddenException('You cannot change your own status');

    // 404 if the target doesn't exist — and the result is the "before" state for the audit
    // entry, which this method previously threw away.
    const before = await this.findById(id);

    // Transaction so the change and its audit entry land together or not at all.
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { status },
        include: { role: { select: { id: true, name: true } } },
      });

      await this.audit.log(tx, {
        actorUserId: actor.id,
        action: 'user.status_change',
        entityType: 'user',
        entityId: id,
        oldValue: { status: before.status },
        newValue: { status },
      });

      return toSafeUser(user);
    });
  }

  async updateRole(id: string, roleName: string, actor: AuthUser) {
    // Self-escalation guard. `user.manage` belongs to `admin`; without this rule an
    // admin could promote themselves to super_admin and inherit every permission in
    // the system — including withdrawal.approve, deliberately withheld from them.
    if (id === actor.id) throw new ForbiddenException('You cannot change your own role');

    // ...and blocking self-promotion is pointless if an admin can crown an accomplice.
    if (roleName === 'super_admin' && actor.role !== 'super_admin') {
      throw new ForbiddenException('Only a super_admin may assign the super_admin role');
    }

    const role = await this.roles.findByName(roleName);
    if (!role) throw new NotFoundException(`Unknown role: ${roleName}`);

    const before = await this.findById(id); // 404 if the target doesn't exist

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { roleId: role.id },
        include: { role: { select: { id: true, name: true } } },
      });

      // Delegation (an admin granting `finance`) is allowed by design — this entry is the
      // control that makes it accountable. Names, not ids, so the log reads without a join.
      await this.audit.log(tx, {
        actorUserId: actor.id,
        action: 'user.role_change',
        entityType: 'user',
        entityId: id,
        oldValue: { role: before.role.name },
        newValue: { role: role.name },
      });

      return toSafeUser(user);
    });
  }
```

> **If `before.role` is typed as possibly undefined**, note that `findById` includes
> `role: { select: { id: true, name: true } }` and throws 404 when the user is missing, so `role` is
> always present at this point. If TypeScript disagrees, the fix is to read the name via the included
> relation on the same object — do **not** add a second query.

  **(d)** In `backend/src/users/users.module.ts`, import `AuditModule` and add an `imports` array:

```typescript
import { AuditModule } from '../audit/audit.module';
```
```typescript
@Module({
  imports: [AuditModule],
  controllers: [UsersController, RolesController],
  providers: [UsersService, RolesService],
  exports: [UsersService, RolesService],
})
```

- [ ] **Step 5: Run the user tests — green.**

```bash
cd backend && npm test -- users.service
```
Expected: all `users.service` tests pass, including the 2 new ones.

- [ ] **Step 6: Full suite + typecheck.**

```bash
cd backend && npx tsc --noEmit && npm test
```
Expected: tsc silent; **10 suites / 81 tests** (79 + 2).

- [ ] **Step 7: Commit.**

```bash
git add backend/src/users
git commit -m "feat: audit user status and role changes (Milestone 5, Task 5)"
```

---

## Task 6: The read API — `GET /audit-logs` — TDD

**Files:**
- Modify: `backend/src/audit/audit.service.ts`
- Modify: `backend/src/audit/audit.service.spec.ts`
- Create: `backend/src/audit/dto/audit-query.dto.ts`
- Create: `backend/src/audit/audit.controller.ts`
- Modify: `backend/src/audit/audit.module.ts`

**Interfaces:**
- Consumes: `AuditService` (Task 3), the existing `JwtAuthGuard`, `PermissionsGuard`,
  `@RequirePermissions` from `src/auth/`.
- Produces: `AuditService.findMany(filters): Promise<{ total, skip, take, logs }>` and
  `GET /audit-logs` gated by `audit.view`.

- [ ] **Step 1: Write the failing tests.** Append to `backend/src/audit/audit.service.spec.ts`:

```typescript
describe('AuditService.findMany', () => {
  const page = (over: any = {}) => ({
    auditLog: {
      findMany: jest.fn().mockResolvedValue([{ id: 'log-1' }]),
      count: jest.fn().mockResolvedValue(1),
      ...over,
    },
  });

  it('returns a page plus the total, newest first', async () => {
    const prisma = page();
    const service = await buildService(prisma);

    const result = await service.findMany({});

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20, orderBy: { createdAt: 'desc' } }),
    );
    expect(result).toEqual({ total: 1, skip: 0, take: 20, logs: [{ id: 'log-1' }] });
  });

  it('composes filters into a single AND-ed where clause', async () => {
    const prisma = page();
    const service = await buildService(prisma);

    await service.findMany({
      actorId: 'user-1',
      entityType: 'wallet',
      action: 'wallet.adjust',
      from: new Date('2026-01-01'),
      to: new Date('2026-12-31'),
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          actorUserId: 'user-1',
          entityType: 'wallet',
          action: 'wallet.adjust',
          createdAt: { gte: new Date('2026-01-01'), lte: new Date('2026-12-31') },
        },
      }),
    );
  });

  it('caps take at 100 so one request cannot pull the whole table', async () => {
    const prisma = page();
    const service = await buildService(prisma);

    const result = await service.findMany({ take: 5000 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
    expect(result.take).toBe(100);
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

```bash
cd backend && npm test -- audit.service
```
Expected: FAIL — `service.findMany is not a function`.

- [ ] **Step 3: Implement `findMany`.** Add to `backend/src/audit/audit.service.ts`, inside the class
      below `log`:

```typescript
  /**
   * One page of audit history, newest first. Filters are optional and AND-combined, serving both
   * real questions from one endpoint: "what did this actor do?" and "what happened to this entity?"
   */
  async findMany(filters: {
    actorId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    from?: Date;
    to?: Date;
    skip?: number;
    take?: number;
  }) {
    const skip = filters.skip ?? 0;
    // Capped so a single request cannot pull the entire table, exactly like GET /users.
    const take = Math.min(filters.take ?? 20, 100);

    const where: Prisma.AuditLogWhereInput = {
      ...(filters.actorId ? { actorUserId: filters.actorId } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { total, skip, take, logs };
  }
```

- [ ] **Step 4: Run the tests — green.**

```bash
cd backend && npm test -- audit.service
```
Expected: **6 tests passing** in `audit.service` (3 log + 3 findMany).

- [ ] **Step 5: Create the query DTO** at `backend/src/audit/dto/audit-query.dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * Query-string filters. Everything is optional; `@Type` conversions are what let the global
 * ValidationPipe (transform: true) turn raw strings into Dates and numbers.
 *
 * Note the deliberate difference from ListUsersQueryDto, which enforces its cap with @Max(100)
 * (so take=5000 is a 400). Here the cap is applied in the service instead, so it protects EVERY
 * caller — including a future job or another service that never passes through this DTO — and
 * take=5000 is clamped to 100 rather than rejected. Do not "fix" this into a @Max; the service
 * unit test asserts the clamp.
 */
export class AuditQueryDto {
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsIn(['transaction', 'wallet', 'user'])
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number;
}
```

- [ ] **Step 6: Create the controller** at `backend/src/audit/audit.controller.ts`:

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

// Staff-only, class-level: there is no customer view of the audit trail. `audit.view` is
// already seeded and held by `admin`, so no seed change is needed.
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('audit.view')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: AuditQueryDto) {
    return this.audit.findMany(query);
  }
}
```

- [ ] **Step 7: Register the controller** in `backend/src/audit/audit.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Module({
  // PermissionsGuard reads the actor's permissions from the DB via UsersService.
  imports: [UsersModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
```

> **Circular-import warning:** `UsersModule` imports `AuditModule` (Task 5) and `AuditModule` now
> imports `UsersModule`. NestJS resolves this only with `forwardRef`. If `npm test` or `tsc` reports a
> circular dependency or an undefined provider, wrap **both** sides:
> in `audit.module.ts` use `imports: [forwardRef(() => UsersModule)]`, and in `users.module.ts` use
> `imports: [forwardRef(() => AuditModule)]`, importing `forwardRef` from `@nestjs/common`.
> Verify with the app actually booting in Task 7 Step 1, not just with unit tests.

- [ ] **Step 8: Full suite + typecheck.**

```bash
cd backend && npx tsc --noEmit && npm test
```
Expected: tsc silent; **10 suites / 84 tests** (81 + 3).

- [ ] **Step 9: Commit.**

```bash
git add backend/src/audit
git commit -m "feat: add GET /audit-logs with filters and pagination (Milestone 5, Task 6)"
```

---

## Task 7: Live proofs + review, learning notes, memory

**Files:**
- Modify: `docs/learning-notes.md`
- Possibly modify: any file the review turns up

- [ ] **Step 1: Start Postgres + the dev server on port 3100.** Port 3000 belongs to an unrelated
      project container — do not stop it.

```bash
cd /Users/max/Documents/GitHub/wallet-system
docker compose up -d
cd backend && npm run prisma:seed   # only if the DB was reset; harmless otherwise (idempotent upserts)
PORT=3100 npm run start:dev          # leave running in the background
```
Wait until `curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3100/auth/login -H 'Content-Type: application/json' -d '{}'`
returns a non-`000` code. **Confirm the log shows `AuditModule dependencies initialized` and
`Mapped {/audit-logs, GET} route`** — this is where a `forwardRef` problem would surface.

- [ ] **Step 2: Proof — an adjustment is audited, atomically.** Run as one block (shell variables do
      not persist between invocations):

```bash
cd /Users/max/Documents/GitHub/wallet-system
API=http://localhost:3100
ADMIN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@wallet.local","password":"ChangeMe123!"}' | jq -r .accessToken)
ALICE=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"fxalice@m4c.test","password":"Password123"}' | jq -r .accessToken)
AW=$(curl -s $API/wallets -H "Authorization: Bearer $ALICE" | jq -r '.[] | select(.currency=="USD") | .id')

echo "== balance before =="
curl -s "$API/wallets/$AW" -H "Authorization: Bearer $ALICE" | jq -c '{balance}'

echo "== finance adjustment (+2500) =="
curl -s -X POST "$API/wallets/$AW/adjustments" -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' \
  -d '{"direction":"credit","amount":2500,"note":"m5 audit proof"}' | jq -c '{type,amount,balanceAfter}'

echo "== the audit entry (expect wallet.adjust, before/after balances, a captured ip) =="
curl -s "$API/audit-logs?entityType=wallet&entityId=$AW" -H "Authorization: Bearer $ADMIN" \
  | jq -c '.logs[0] | {action,entityType,entityId,oldValue,newValue,ipAddress,actorUserId}'
```
Expected: the adjustment returns `balanceAfter` = previous + 2500, and **one** audit row with
`action: "wallet.adjust"`, `oldValue.balance` = the previous balance, `newValue.balance` = the new one,
plus `note`/`direction`/`amount`, and a non-null `ipAddress` (`::1` or `::ffff:127.0.0.1` locally).

- [ ] **Step 3: Proof — a role change is audited with names, and delegation is now accountable.**

```bash
cd /Users/max/Documents/GitHub/wallet-system
API=http://localhost:3100
ADMIN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@wallet.local","password":"ChangeMe123!"}' | jq -r .accessToken)
BOBID=$(curl -s "$API/users?take=100" -H "Authorization: Bearer $ADMIN" \
  | jq -r '.users[] | select(.email=="fxbob@m4c.test") | .id')

echo "== promote fxbob to finance =="
curl -s -X PATCH "$API/users/$BOBID/role" -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' -d '{"role":"finance"}' | jq -c '{id,role:.role.name}'

echo "== audit entry (expect role NAMES, not uuids) =="
curl -s "$API/audit-logs?entityType=user&entityId=$BOBID" -H "Authorization: Bearer $ADMIN" \
  | jq -c '.logs[0] | {action,oldValue,newValue,actorUserId}'
```
Expected: `action: "user.role_change"` with `oldValue: {"role":"user"}` and
`newValue: {"role":"finance"}`. (The PATCH body key is `role` — `UpdateUserRoleDto` takes a role
*name*, not an id.)

- [ ] **Step 4: Proof — the audit log is staff-only and filters work.**

```bash
cd /Users/max/Documents/GitHub/wallet-system
API=http://localhost:3100
ADMIN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@wallet.local","password":"ChangeMe123!"}' | jq -r .accessToken)
ALICE=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"fxalice@m4c.test","password":"Password123"}' | jq -r .accessToken)

echo "== a customer must NOT read the audit log (expect 403) =="
curl -s -o /dev/null -w '%{http_code}\n' "$API/audit-logs" -H "Authorization: Bearer $ALICE"

echo "== filter by action (expect only wallet.adjust rows) =="
curl -s "$API/audit-logs?action=wallet.adjust&take=5" -H "Authorization: Bearer $ADMIN" \
  | jq -c '{total, actions: [.logs[].action] | unique}'

echo "== take is capped at 100 =="
curl -s "$API/audit-logs?take=5000" -H "Authorization: Bearer $ADMIN" | jq -c '{take}'
```
Expected: `403` for the customer; the filtered query returns only `["wallet.adjust"]`; `take` is `100`.

- [ ] **Step 5: Proof — atomicity. A failed operation writes NO audit row.**
      A rejected adjustment (one that would make the balance negative) must roll back both the money
      and the audit entry.

```bash
cd /Users/max/Documents/GitHub/wallet-system
API=http://localhost:3100
ADMIN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@wallet.local","password":"ChangeMe123!"}' | jq -r .accessToken)
ALICE=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"fxalice@m4c.test","password":"Password123"}' | jq -r .accessToken)
AW=$(curl -s $API/wallets -H "Authorization: Bearer $ALICE" | jq -r '.[] | select(.currency=="USD") | .id')

BEFORE=$(curl -s "$API/audit-logs?entityType=wallet&entityId=$AW" -H "Authorization: Bearer $ADMIN" | jq -r .total)
echo "audit rows before: $BEFORE"

echo "== debit far more than the balance (expect 400) =="
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$API/wallets/$AW/adjustments" \
  -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' \
  -d '{"direction":"debit","amount":99999999,"note":"should roll back"}'

AFTER=$(curl -s "$API/audit-logs?entityType=wallet&entityId=$AW" -H "Authorization: Bearer $ADMIN" | jq -r .total)
echo "audit rows after:  $AFTER"
```
Expected: `400`, and **`AFTER` equals `BEFORE`** — the failed adjustment left no audit row, because the
audit INSERT was inside the transaction that rolled back. This is the milestone's central claim,
demonstrated end to end.

- [ ] **Step 6: Full verification + boundary checks.** Run from the repo root so the paths resolve.

```bash
cd /Users/max/Documents/GitHub/wallet-system/backend && npx tsc --noEmit && npm test 2>&1 | tail -5
cd /Users/max/Documents/GitHub/wallet-system
echo "=== prisma.auditLog outside src/audit/ (expect clean) ==="
grep -rn "prisma\.auditLog\|auditLog\." backend/src --include="*.ts" | grep -v "\.spec\.ts" | grep -v "src/audit/" || echo "clean"
echo "=== audit.log called with the root client (expect none) ==="
grep -rn "audit\.log(this\.prisma" backend/src --include="*.ts" || echo "clean — always called with tx"
echo "=== update/delete on auditLog anywhere (expect none) ==="
grep -rn "auditLog\.\(update\|delete\|deleteMany\|updateMany\)" backend/src --include="*.ts" || echo "clean — append-only"
```
Expected: **10 suites / 84 tests**; all three checks print `clean`.

- [ ] **Step 7: Run the spec's §12 checklist**
      (`../specs/2026-07-24-wallet-milestone-5-audit-logging-design.md`) and tick each box.

- [ ] **Step 8: Read the diff with fresh eyes.** `git diff 8c8ead1..HEAD -- backend/`. Check: is `log`
      called with `tx` at all six call sites (never `this.prisma`)? Do `updateStatus`/`updateRole`
      genuinely open a transaction? Can `passwordHash` reach any `oldValue`/`newValue`? Is there any
      path that updates or deletes an audit row? Fix what you find; commit separately.

- [ ] **Step 9: Append the M5 sections to `docs/learning-notes.md`.** Cover, in plain English:
  - **The system spine completed** — RBAC check → state change → audit entry, and why the last two
    being one atomic unit is the whole point.
  - **Why the audit write goes INSIDE the transaction while M4c's rate fetch stayed OUTSIDE** — the
    rule was never "keep transactions empty", it is "keep transactions free of *slow and external*
    work". A local INSERT on a connection already held costs microseconds.
  - **How that decision constrained the mechanism** — an interceptor runs after the service's
    `$transaction` has already committed, so it *cannot* provide an atomic audit; the explicit
    `log(tx, …)` call was forced, not chosen. Include the timeline diagram.
  - **AsyncLocalStorage** — what request-scoped storage is, why services must stay transport-agnostic,
    and why middleware (a plain callback) is the reliable host while an interceptor's Observable would
    silently lose the store.
  - **Changed fields only** — how storing whole rows would put `passwordHash` in a table every admin
    can read, and why "impossible by construction" beats "remember to strip it".
  - **No foreign key on `actorUserId`** — RESTRICT would block deleting users forever, CASCADE would
    erase the audit trail; an audit record must outlive its subject.
  - **Deliberate non-goals** — auth events, hash-chaining/tamper-evidence, retention, DB-level
    append-only enforcement.

- [ ] **Step 10: Milestone recap section** in `docs/learning-notes.md`, following the M4a/M4b/M4c recap
      shape: the new endpoint table row (`GET /audit-logs`, `audit.view`), the six audited actions and
      what each records, the write path (edge captures context → service changes state → `log(tx)` in
      the same transaction → both commit or neither), and the deferred list.

- [ ] **Step 11: Commit the notes.**

```bash
git add docs/learning-notes.md
git commit -m "docs: consolidate Milestone 5 learning notes (Milestone 5, Task 7)"
```

- [ ] **Step 12: Update the project memory** at
      `/Users/max/.claude/projects/-Users-max-Documents-GitHub-wallet-system/memory/wallet-system-project.md`:
      mark M5 complete with its commit range and per-task ✅ list, note the AsyncLocalStorage +
      middleware decision and the atomic-audit guarantee, and set the next step (M6 Angular frontend;
      KYC still optional). Update the `MEMORY.md` index line accordingly.

---

## Milestone 5 self-review checklist (run before the next milestone)

- [ ] `npm test` green (**84 tests**, 10 suites); `npx tsc --noEmit` clean.
- [ ] Clean commits, one per task.
- [ ] All live proofs reproduced: an adjustment audited with before/after and a captured IP; a role
      change audited with role names; a customer `403`d from `/audit-logs`; filters and the 100 cap
      working; **and a failed operation leaving no audit row**.
- [ ] Boundary checks clean: `prisma.auditLog` only in `src/audit/`; `log` never called with the root
      client; no update/delete path to `AuditLog`.
- [ ] **You can explain:** why the audit write belongs inside the transaction while the FX call did
      not; why an interceptor cannot deliver an atomic audit; what `AsyncLocalStorage` is and why
      middleware hosts it; why only changed fields are stored; and why `actorUserId` has no FK.

---

## What a later audit enhancement could cover (preview, not scheduled)

**Tamper-evidence via hash-chaining:** each row stores a hash of `(its own content + the previous
row's hash)`, so altering any historical row breaks every hash after it and the tampering is provable.
This is the genuinely interesting hardening and the natural companion to append-only. Also:
**authentication events** (login/logout/refresh — the schema already supports them, it is purely
additional call sites), **retention and archival** policies, and **DB-level append-only enforcement**
via a Postgres trigger that raises on `UPDATE`/`DELETE`.
