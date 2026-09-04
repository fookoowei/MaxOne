import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

// Every mutable table, children first. Role/Permission are seed data and are NOT touched.
const MUTABLE = [
  'IdempotencyKey', 'RefreshToken', 'Passkey', 'PushSubscription', 'PriceAlert', 'Holding',
  'WatchlistItem', 'AuditLog', 'Transaction', 'Wallet', 'User',
];

// Wipe test data between tests (one TRUNCATE, CASCADE handles FKs).
export async function resetDb(prisma: PrismaService): Promise<void> {
  const tables = MUTABLE.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}

// Boot the REAL app (real Prisma, guards, interceptors) against the test DB, with the same
// global ValidationPipe main.ts uses, so HTTP tests behave like production.
export async function bootApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  if (!/_test/.test(process.env.DATABASE_URL ?? '')) {
    throw new Error('Integration tests must run via `npm run test:integration` (test DB only)');
  }
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}
