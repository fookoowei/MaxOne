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
