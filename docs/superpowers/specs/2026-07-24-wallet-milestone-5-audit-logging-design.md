# Milestone 5 — Audit Logging (design)

**Status:** approved 2026-07-24
**Implements:** §7 "Audit logging" and §8 "The system spine" of
`2026-07-13-wallet-management-system-design.md`.

---

## 1. Goal

Every consequential action — money moving, and privilege changing — leaves a permanent,
queryable record of **who did what, to which entity, from where, and what changed**. The
record is written **atomically with the change itself**, so a state change without its audit
entry is impossible.

This completes the system spine promised in the original design:

```
RBAC check (permission) → state change (inside DB transaction) → audit log entry
                          └──────────── one atomic unit ────────────┘
```

## 2. Scope

**Audited (6 operations, 8 action values):**

| Action value | Call site | entityType |
|---|---|---|
| `deposit.approve` / `withdrawal.approve` | `WalletsService.approve` | `transaction` |
| `deposit.reject` / `withdrawal.reject` | `WalletsService.reject` | `transaction` |
| `wallet.adjust` | `WalletsService.adjust` | `wallet` |
| `wallet.transfer` | `WalletsService.transfer` | `wallet` |
| `user.status_change` | `UsersService.updateStatus` | `user` |
| `user.role_change` | `UsersService.updateRole` | `user` |

`approve`/`reject` are generic over `type`, so the action value is derived from the loaded
row's `type` (`deposit` or `withdrawal`) — one call site, two action values.

**Not audited this milestone:** authentication events (login / logout / refresh). They are
high-volume, live in a different module, and add plumbing rather than new thinking. Deferred
deliberately, not forgotten — see §10.

**Why these:** two earlier milestones explicitly deferred their control weakness to M5.
Direct adjustments (`requestedBy === reviewedBy`) were accepted as a known weakness
"mitigated by narrow permission + mandatory note + M5 audit", and role delegation (an admin
granting `finance`) was accepted as "allowed and audited, not blocked". This milestone is
where those mitigations become real.

## 3. Data model

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  actorUserId String              // userId of whoever performed the action
  action      String              // closed set, see §2
  entityType  String              // "transaction" | "wallet" | "user"
  entityId    String
  oldValue    Json?               // changed fields only, before
  newValue    Json?               // changed fields only, after
  ipAddress   String?             // captured at the HTTP edge, see §6
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([actorUserId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

### 3.1 Deliberate departures from the original spec sketch

**`createdAt`, not `timestamp`.** Consistent with every other model in the schema.

**`actorUserId` is a plain `String` with no foreign key.** This matches the existing
`requestedBy` / `reviewedBy` convention on `Transaction`, but here the reasoning is stronger
than consistency — a foreign key would force a choice between two bad outcomes:

- `ON DELETE RESTRICT` → a user who ever acted can never be deleted.
- `ON DELETE CASCADE` → deleting a user **erases their audit trail**, which is precisely what
  an audit log exists to prevent.

An audit record must outlive its subject. No FK is the correct call.

**`userAgent` added.** Not in the original sketch, but it costs one nullable column and
answers "was this the admin console or a script?" — a question that comes up in every real
incident review.

### 3.2 Indexes

Three, matching the three real queries: *what did this actor do* (`actorUserId`), *what
happened to this entity* (`entityType, entityId`), *what happened recently* (`createdAt`).

## 4. Atomicity — the central decision

The audit entry is written **inside the same database transaction** as the change it records.

`AuditService.log()` takes the transaction client as its first argument:

```typescript
log(tx: Prisma.TransactionClient, entry: AuditEntry): Promise<void>
```

so the INSERT runs on the same connection, inside the same transaction, as the balance
update. Both commit or neither does.

**Why this over fire-and-forget:** a crash between "money moved" and "audit written" leaves
an unattributable money movement — a silent compliance hole, and the first thing an auditor
asks about. Making the pair atomic removes the failure mode entirely rather than making it
rare.

**The cost, stated honestly:** a bug in the audit write can block a money movement. For a
regulated system that is the correct direction to fail — refusing to move money you cannot
account for is better than moving money you cannot explain.

**Why this is cheap here, unlike M4c's rate fetch.** M4c established that external I/O must
never run inside a lock, because an HTTP call can hang for seconds while two wallets stay
frozen. The audit write is the opposite kind of operation: a **local INSERT on a connection
already held**, costing microseconds and requiring no network. The rule was never "keep
transactions empty" — it is "keep transactions free of *slow and external* work". The audit
write belongs inside for the same reason the rate fetch had to stay outside.

### 4.1 Consequence: two methods must gain a transaction

`UsersService.updateStatus` and `updateRole` are currently bare `prisma.user.update` calls
with no transaction. To honour atomicity they will be wrapped in `prisma.$transaction`, making
the rule uniform: **every audited mutation runs in a transaction.**

Both methods already call `findById(id)` for its 404 side-effect and discard the result. That
discarded row is exactly the "before" state, so capturing it costs nothing.

### 4.2 Consequence: the mechanism is constrained, not chosen

Automatic approaches were considered and rejected on mechanical grounds, not taste:

- **A NestJS interceptor** runs around the controller handler, but the `$transaction` opens
  *and commits* inside the service call beneath it. By the time the interceptor's post-handler
  code runs, Postgres has already committed — there is no transaction left to join.
- **A Prisma extension** on writes has no knowledge of the actor (services do not pass identity
  down to Prisma) and would log noisy internal writes such as refresh-token rotation.

An explicit `AuditService.log(tx, …)` call is therefore the only option compatible with §4.
This is a feature as much as a constraint: *what is audited* stays visible in the code rather
than hidden behind a decorator.

## 5. Values — changed fields only

`oldValue` / `newValue` record **only the fields that changed**:

```jsonc
// user.status_change
"oldValue": { "status": "active" },
"newValue": { "status": "suspended" }

// wallet.adjust
"oldValue": { "balance": 5000 },
"newValue": { "balance": 7500 }
```

**Why not full row snapshots.** Audit logs are readable by every `audit.view` holder. A `User`
row contains `passwordHash`; a full snapshot would need an explicit strip-list, and one
forgotten field becomes a credential leak in a widely-readable table. Recording only what
changed makes that leak impossible by construction rather than by vigilance.

The trade-off is accepted: the log answers "what changed" but cannot rebuild a whole entity at
a point in time. For money, that gap is already covered — the ledger's
`balanceBefore` → `balanceAfter` chain is the authoritative reconstruction.

### 5.1 Exactly what each action records

| Action | `entityId` | `oldValue` | `newValue` |
|---|---|---|---|
| `deposit.approve` / `withdrawal.approve` | the transaction id | `{ status: "pending" }` | `{ status: "approved", balanceAfter }` |
| `deposit.reject` / `withdrawal.reject` | the transaction id | `{ status: "pending" }` | `{ status: "rejected", note }` |
| `wallet.adjust` | the wallet id | `{ balance }` before | `{ balance }` after, plus `{ direction, amount, note }` |
| `wallet.transfer` | the **source** wallet id | `{ balance }` of the source before | `{ balance }` of the source after, plus `{ toWalletId, amount, credit, exchangeRate }` |
| `user.status_change` | the target user id | `{ status }` before | `{ status }` after |
| `user.role_change` | the target user id | `{ role }` before (name) | `{ role }` after (name) |

Two conventions worth stating explicitly:

- **A transfer is anchored to the source wallet**, because that is the wallet the actor owns and
  acted upon. The destination is not a second audit entry — it appears in `newValue.toWalletId`,
  and the ledger already holds both halves linked by `transferId`. One action by one actor is
  one audit row.
- **`user.role_change` records role *names*, not ids.** A log that says `"finance" → "admin"` is
  readable during an incident; one that says two UUIDs requires a join to be useful at all.

## 6. Request context — AsyncLocalStorage

`ipAddress` and `userAgent` exist only on the HTTP request, but services are deliberately
transport-agnostic — `WalletsService` receives an actor and primitives and must not learn that
HTTP exists. Threading the request through every signature down to `AuditService` would leak
transport concerns through four layers.

Instead, **middleware captures the context into `AsyncLocalStorage`** (Node's request-scoped
store that follows the async call chain), and `AuditService` reads it directly:

```
Middleware  →  als.run({ ip, userAgent }, next)
                   └─ Guards → Controller → Service → AuditService reads the store
```

New `AuditContextMiddleware` (in `AuditModule`), applied globally in `AppModule` via
`configure(consumer)`.

### 6.1 Why middleware rather than an interceptor

An interceptor returns an Observable, and `als.run(store, () => next.handle())` **loses the
store**: `run()` returns the Observable immediately, but the handler executes on
*subscription*, which happens after `run()` has exited. Making it work requires hand-wrapping
the subscription inside `run()`.

Middleware is a plain callback, so everything downstream runs inside the context with no
special handling. Same concept learned (AsyncLocalStorage — the mechanism behind correlation
IDs and distributed tracing), with the tool that fits. A genuine interceptor is deferred to M7,
where wrapping the response is the actual goal.

### 6.2 Missing context is not an error

If the store is empty — a service called outside an HTTP request, e.g. from a future job or a
unit test — `ipAddress`/`userAgent` are simply `null`. Audit must never fail because the
network metadata is unavailable; the actor and the change are the essential facts.

## 7. Read API

```
GET /audit-logs
```

Guarded by `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@RequirePermissions('audit.view')`.
The permission is already seeded and held by `admin`; no seed change is needed.

Optional filters, all AND-combined: `actorId`, `entityType`, `entityId`, `action`, `from`,
`to` (createdAt range). Pagination `skip` / `take`, reverse-chronological, **`take` capped at
100** — the same shape and cap as the existing `GET /users`.

Serving both real questions — "what did this admin do?" and "what happened to this wallet?" —
from one filtered endpoint. A dedicated per-entity history route would be the same query behind
a second URL; if M6's UI wants a timeline, it can call this.

## 8. Module boundary

New `AuditModule`:

```
backend/src/audit/
├── audit.service.ts          # log() + findMany(); sole owner of prisma.auditLog
├── audit.controller.ts       # GET /audit-logs, audit.view gated
├── audit.context.ts          # AsyncLocalStorage instance + typed helpers
├── audit.middleware.ts       # captures ip/userAgent into the store
├── audit.actions.ts          # the closed union of action values
└── audit.module.ts           # provides + exports AuditService
```

`AuditModule` is the **only** place `prisma.auditLog` is touched — the same discipline that
makes `WalletsModule` the sole owner of `prisma.wallet`/`prisma.transaction` and `RatesModule`
the sole owner of the FX call. Enforced by a boundary grep in the final task.

`WalletsModule` and `UsersModule` import `AuditModule`.

The action values live in `audit.actions.ts` as a **typed union**, not free-form strings, so a
typo is a compile error and the complete set of audited actions is discoverable in one file.

## 9. Append-only

Enforced at the application layer: `AuditService` exposes only `log` and `findMany`. There is
no update or delete method, no route that could reach one, and `AuditModule` owns the table.

Database-level enforcement (a Postgres trigger raising on `UPDATE`/`DELETE`) was considered and
deliberately deferred — it is stronger, but it means hand-written SQL in a migration and test
cleanup working around it, for a guarantee the app layer already provides. Consistent with how
the ledger's immutability is handled today. Noted as a post-M7 candidate alongside
hash-chaining.

## 10. Non-goals (deliberate)

- **Authentication events** (login success/failure, logout, refresh). High-volume, different
  module, more plumbing than insight. The schema needs no change to add them later.
- **Tamper-evidence / hash-chaining** — each row carrying a hash of its predecessor, so any
  edit breaks the chain. The genuinely interesting hardening, and a strong post-M7 enhancement.
- **Retention, archival, log rotation.** An operations concern with no bearing on the design.
- **Reading the audit log as a customer.** `audit.view` is staff-only by design.
- **A UI timeline** — M6.
- **Async/queued writes.** Directly contradicts §4.

## 11. Testing

TDD throughout, matching the existing mock style.

- **`AuditService`** — unit tests for `log` (writes the expected row, tolerates an empty ALS
  store) and `findMany` (filters compose, `take` capped at 100).
- **Each call site** — assert an audit entry is written, with the correct action, entity, and
  changed-field values. Critically, assert it is written **with the same `tx` client** as the
  state change; that is the §4 atomicity guarantee made testable.
- **Middleware** — unit test that a value stored in the ALS context is visible to a callee.
- **Live proof** on real Postgres: approve a deposit and confirm the audit row exists with the
  correct actor, before/after, and a captured IP; suspend a user and confirm the same;
  `GET /audit-logs` filters correctly and 403s without `audit.view`.

Known limitation, carried from M4a: `npm test` mocks `$queryRaw`/`$transaction`, so unit tests
verify that `log` receives the transaction client, not that Postgres truly rolled both back
together. The end-to-end atomicity claim rests on the live proof, as with the lock ordering.

## 12. Self-review checklist (run before the next milestone)

- [ ] `npm test` green; `npx tsc --noEmit` clean.
- [ ] `prisma.auditLog` appears only inside `src/audit/`.
- [ ] Every one of the 6 audited operations writes an entry **with the transaction client**,
      never with the root Prisma client.
- [ ] `updateStatus` / `updateRole` now run inside `$transaction`.
- [ ] No update or delete path to `AuditLog` exists anywhere.
- [ ] `oldValue`/`newValue` contain changed fields only — no `passwordHash` can appear.
- [ ] `GET /audit-logs` is `audit.view`-gated, capped at 100, and filters compose.
- [ ] Empty ALS context yields `null` ip/userAgent rather than an error.
- [ ] **You can explain:** why the audit write belongs *inside* the transaction while M4c's rate
      fetch had to stay *outside*; why an interceptor cannot provide an atomic audit; why
      `actorUserId` has no foreign key; and why only changed fields are stored.
