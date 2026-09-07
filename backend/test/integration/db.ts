import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { REDIS_CLIENT } from '../../src/cache/cache.service';

/** The two Redis commands the harness needs (ioredis has them; keeps the type narrow). */
export interface TestRedis {
  flushdb(): Promise<unknown>;
  get(key: string): Promise<string | null>;
  ttl(key: string): Promise<number>;
}

// Every mutable table, children first. Role/Permission are seed data and are NOT touched.
const MUTABLE = [
  'IdempotencyKey', 'RefreshToken', 'Passkey', 'PushSubscription', 'PriceAlert', 'Holding',
  'WatchlistItem', 'AuditLog', 'Transaction', 'Wallet', 'User',
];

// Wipe test data between tests (one TRUNCATE, CASCADE handles FKs); pass `redis` to also empty
// the cache (db index 1 only — guarded in run.js) so a cached value can't leak across tests.
export async function resetDb(prisma: PrismaService, redis?: TestRedis): Promise<void> {
  const tables = MUTABLE.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
  if (redis) await redis.flushdb();
}

// Boot the REAL app (real Prisma, guards, interceptors) against the test DB, with the same
// global ValidationPipe main.ts uses, so HTTP tests behave like production.
export async function bootApp(): Promise<{ app: INestApplication; prisma: PrismaService; redis: TestRedis }> {
  if (!/_test/.test(process.env.DATABASE_URL ?? '')) {
    throw new Error('Integration tests must run via `npm run test:integration` (test DB only)');
  }
  if (!/\/1$/.test(process.env.REDIS_URL ?? '')) {
    throw new Error('Integration tests must use Redis db index 1 (REDIS_URL=...:6379/1)');
  }
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return { app, prisma: app.get(PrismaService), redis: app.get<TestRedis>(REDIS_CLIENT) };
}
