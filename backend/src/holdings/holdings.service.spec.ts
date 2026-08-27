import { HoldingsService } from './holdings.service';

const actor = { id: 'u1', email: 'a@b.c', role: 'user' } as any;

describe('HoldingsService', () => {
  it("lists only the actor's holdings", async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'h1' }]);
    const service = new HoldingsService({ holding: { findMany } } as any);
    await service.list(actor);
    expect(findMany).toHaveBeenCalledWith({ where: { userId: 'u1' }, orderBy: { createdAt: 'asc' } });
  });

  it('adds idempotently via upsert (sets quantity + avgCost)', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 'h1' });
    const service = new HoldingsService({ holding: { upsert } } as any);
    await service.add(actor, { symbol: 'BTC', type: 'crypto', quantity: 0.5, avgCost: 30000 });
    expect(upsert).toHaveBeenCalledWith({
      where: { userId_symbol: { userId: 'u1', symbol: 'BTC' } },
      create: { userId: 'u1', symbol: 'BTC', type: 'crypto', quantity: 0.5, avgCost: 30000 },
      update: { quantity: 0.5, avgCost: 30000, type: 'crypto' },
    });
  });

  it('removes by userId + symbol', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new HoldingsService({ holding: { deleteMany } } as any);
    await service.remove(actor, 'BTC');
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', symbol: 'BTC' } });
  });
});
