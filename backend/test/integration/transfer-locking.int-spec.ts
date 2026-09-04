import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { WalletsService } from '../../src/wallets/wallets.service';
import { bootApp, resetDb } from './db';

describe('WalletsService.transfer locking against a real Postgres', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let wallets: WalletsService;

  beforeAll(async () => {
    ({ app, prisma } = await bootApp());
    wallets = app.get(WalletsService);
  });
  beforeEach(() => resetDb(prisma));
  afterAll(() => app.close());

  async function fundedUser(tag: string, balance: number) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'user' } });
    const user = await prisma.user.create({
      data: { email: `${tag}@test.local`, handle: tag, passwordHash: 'x', firstName: tag, lastName: 'T', roleId: role.id },
    });
    const wallet = await prisma.wallet.create({ data: { userId: user.id, name: 'main', currency: 'USD', balance } });
    return { actor: { id: user.id, email: user.email, role: 'user' }, wallet };
  }

  it('opposite transfers fired at the same instant both succeed (sorted lock order → no deadlock) and net exactly', async () => {
    const a = await fundedUser('alice', 10_000);
    const b = await fundedUser('bob', 10_000);

    // Alice→Bob 3000 and Bob→Alice 1000, concurrently. Naive sender-then-receiver locking would
    // deadlock here (each holds the row the other needs); sorted-id locking makes both take the
    // same first lock, so one simply waits for the other.
    await Promise.all([
      wallets.transfer(a.wallet.id, a.actor, { toWalletId: b.wallet.id, amount: 3000 }),
      wallets.transfer(b.wallet.id, b.actor, { toWalletId: a.wallet.id, amount: 1000 }),
    ]);

    const [wa, wb] = await Promise.all([
      prisma.wallet.findUniqueOrThrow({ where: { id: a.wallet.id } }),
      prisma.wallet.findUniqueOrThrow({ where: { id: b.wallet.id } }),
    ]);
    expect(wa.balance).toBe(10_000 - 3000 + 1000);
    expect(wb.balance).toBe(10_000 + 3000 - 1000);
    expect(wa.balance + wb.balance).toBe(20_000); // money is conserved

    const rows = await prisma.transaction.findMany();
    expect(rows).toHaveLength(4); // 2 transfers × (out + in)
    const byTransfer = new Map<string, number>();
    for (const r of rows) byTransfer.set(r.transferId!, (byTransfer.get(r.transferId!) ?? 0) + 1);
    expect([...byTransfer.values()]).toEqual([2, 2]); // each pair shares one transferId
  });

  it('refuses to overdraw even under a concurrent double-spend attempt', async () => {
    const a = await fundedUser('carol', 5000);
    const b = await fundedUser('dave', 0);
    // Two 4000 sends from a 5000 balance at once: at most ONE can succeed.
    const results = await Promise.allSettled([
      wallets.transfer(a.wallet.id, a.actor, { toWalletId: b.wallet.id, amount: 4000 }),
      wallets.transfer(a.wallet.id, a.actor, { toWalletId: b.wallet.id, amount: 4000 }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const wa = await prisma.wallet.findUniqueOrThrow({ where: { id: a.wallet.id } });
    expect(wa.balance).toBe(1000); // never negative, never double-debited
  });
});
