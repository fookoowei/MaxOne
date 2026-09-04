import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { bootApp, resetDb } from './db';

describe('integration harness', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => ({ app, prisma } = await bootApp()));
  beforeEach(() => resetDb(prisma));
  afterAll(() => app.close());

  it('talks to the TEST database only', () => {
    expect(process.env.DATABASE_URL).toMatch(/_test/);
  });

  it('has the seeded roles and permissions, which survive a reset', async () => {
    expect(await prisma.role.count()).toBe(5);
    expect(await prisma.permission.count()).toBeGreaterThan(0);
    expect(await prisma.user.count()).toBe(0); // resetDb wiped the seeded super-admin user
  });
});
