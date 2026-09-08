import { OverviewService } from './overview.service';

describe('OverviewService.report (M18b dashboard work queue)', () => {
  const tx = (over: Partial<{ id: string; type: string; amount: number }> = {}) => ({
    id: 't1', type: 'deposit', amount: 10000, note: null, createdAt: new Date('2026-09-08T01:00:00Z'),
    wallet: { id: 'w1', name: 'Main', currency: 'USD', user: { email: 'jane@x' } }, ...over,
  });
  function build() {
    const prisma = {
      transaction: {
        count: jest.fn()
          .mockResolvedValueOnce(3) // pending
          .mockResolvedValueOnce(7) // approved today
          .mockResolvedValueOnce(1), // rejected today
        findFirst: jest.fn().mockResolvedValue({ createdAt: new Date('2026-09-07T10:00:00Z') }),
        groupBy: jest.fn().mockResolvedValue([
          { type: 'deposit', _count: { _all: 2 }, _sum: { amount: 30000 } },
          { type: 'withdrawal', _count: { _all: 1 }, _sum: { amount: 5000 } },
        ]),
        findMany: jest.fn().mockResolvedValue([tx(), tx({ id: 't2', type: 'withdrawal', amount: 5000 })]),
      },
    };
    return { prisma, svc: new OverviewService(prisma as any) };
  }

  it('aggregates pending count/oldest/by-type, today\'s decisions, and the 5 oldest pending rows', async () => {
    const { svc, prisma } = build();
    const now = new Date('2026-09-08T15:30:00'); // local time; startOfDay = 00:00 local
    const r = await svc.report(now);
    expect(r.pending).toEqual({
      count: 3,
      oldestCreatedAt: '2026-09-07T10:00:00.000Z',
      byType: { deposit: { count: 2, amount: 30000 }, withdrawal: { count: 1, amount: 5000 } },
    });
    expect(r.today).toEqual({ approved: 7, rejected: 1 });
    expect(r.oldestPending).toHaveLength(2);
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5, orderBy: { createdAt: 'asc' } }));
    const todayWhere = prisma.transaction.count.mock.calls[1][0].where;
    expect(todayWhere.status).toBe('approved');
    expect(todayWhere.reviewedAt.gte.getHours()).toBe(0);
  });

  it('an empty queue reports zeros, not undefined', async () => {
    const { svc, prisma } = build();
    prisma.transaction.count.mockReset().mockResolvedValue(0);
    prisma.transaction.findFirst.mockResolvedValue(null);
    prisma.transaction.groupBy.mockResolvedValue([]);
    prisma.transaction.findMany.mockResolvedValue([]);
    const r = await svc.report();
    expect(r.pending).toEqual({ count: 0, oldestCreatedAt: null, byType: { deposit: { count: 0, amount: 0 }, withdrawal: { count: 0, amount: 0 } } });
    expect(r.oldestPending).toEqual([]);
  });
});
