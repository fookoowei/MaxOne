import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface OverviewReport {
  pending: {
    count: number;
    oldestCreatedAt: string | null;
    byType: Record<'deposit' | 'withdrawal', { count: number; amount: number }>;
  };
  today: { approved: number; rejected: number };
  oldestPending: {
    id: string;
    type: string;
    amount: number;
    note: string | null;
    createdAt: Date;
    wallet: { id: string; name: string; currency: string; user: { email: string } };
  }[];
}

/**
 * M18b: the dashboard's work queue in one round trip. Exception-first: what needs a decision
 * (pending count, how long the oldest has waited, how much money is in flight) and what got
 * decided today. Six queries in parallel; all read-only.
 */
@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async report(now = new Date()): Promise<OverviewReport> {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const pending = { status: 'pending' } as const;

    const [count, oldest, byType, approved, rejected, oldestPending] = await Promise.all([
      this.prisma.transaction.count({ where: pending }),
      this.prisma.transaction.findFirst({ where: pending, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      this.prisma.transaction.groupBy({ by: ['type'], where: pending, _count: { _all: true }, _sum: { amount: true } }),
      this.prisma.transaction.count({ where: { status: 'approved', reviewedAt: { gte: startOfDay } } }),
      this.prisma.transaction.count({ where: { status: 'rejected', reviewedAt: { gte: startOfDay } } }),
      this.prisma.transaction.findMany({
        where: pending,
        orderBy: { createdAt: 'asc' },
        take: 5,
        select: {
          id: true,
          type: true,
          amount: true,
          note: true,
          createdAt: true,
          wallet: { select: { id: true, name: true, currency: true, user: { select: { email: true } } } },
        },
      }),
    ]);

    const empty = { count: 0, amount: 0 };
    const typed: OverviewReport['pending']['byType'] = { deposit: { ...empty }, withdrawal: { ...empty } };
    for (const g of byType) {
      if (g.type === 'deposit' || g.type === 'withdrawal') {
        typed[g.type] = { count: g._count._all, amount: g._sum.amount ?? 0 };
      }
    }
    return {
      pending: { count, oldestCreatedAt: oldest?.createdAt.toISOString() ?? null, byType: typed },
      today: { approved, rejected },
      oldestPending,
    };
  }
}
