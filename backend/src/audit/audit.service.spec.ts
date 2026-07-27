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
