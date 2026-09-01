import { AlertsService } from './alerts.service';

const actor = { id: 'u1', email: 'a@b.c', role: 'user' } as any;

describe('AlertsService', () => {
  it("lists only the actor's alerts", async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'a1' }]);
    const service = new AlertsService({ priceAlert: { findMany } } as any);
    await service.list(actor);
    expect(findMany).toHaveBeenCalledWith({ where: { userId: 'u1' }, orderBy: { createdAt: 'asc' } });
  });

  it('adds an alert scoped to the actor', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'a1' });
    const service = new AlertsService({ priceAlert: { create } } as any);
    await service.add(actor, { symbol: 'BTC', type: 'crypto', targetPrice: 80000, direction: 'above' });
    expect(create).toHaveBeenCalledWith({
      data: { userId: 'u1', symbol: 'BTC', type: 'crypto', targetPrice: 80000, direction: 'above' },
    });
  });

  it('removes by alert id AND userId (can only delete own)', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new AlertsService({ priceAlert: { deleteMany } } as any);
    await service.remove(actor, 'a1');
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'a1', userId: 'u1' } });
  });

  it('findPending queries only alerts with triggeredAt null (all users)', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'a1' }]);
    const service = new AlertsService({ priceAlert: { findMany } } as any);
    await service.findPending();
    expect(findMany).toHaveBeenCalledWith({ where: { triggeredAt: null } });
  });

  it('markTriggered sets triggeredAt for the given ids', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });
    const service = new AlertsService({ priceAlert: { updateMany } } as any);
    await service.markTriggered(['a1', 'a2']);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a1', 'a2'] } },
      data: { triggeredAt: expect.any(Date) },
    });
  });
});
