import { WatchlistService } from './watchlist.service';

const actor = { id: 'u1', email: 'a@b.c', role: 'user' } as any;

describe('WatchlistService', () => {
  it("lists only the actor's items, oldest first", async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'w1' }]);
    const service = new WatchlistService({ watchlistItem: { findMany } } as any);

    await service.list(actor);

    expect(findMany).toHaveBeenCalledWith({ where: { userId: 'u1' }, orderBy: { createdAt: 'asc' } });
  });

  it('adds idempotently via upsert on (userId, symbol)', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 'w1' });
    const service = new WatchlistService({ watchlistItem: { upsert } } as any);

    await service.add(actor, { symbol: 'BTC', type: 'crypto' });

    expect(upsert).toHaveBeenCalledWith({
      where: { userId_symbol: { userId: 'u1', symbol: 'BTC' } },
      create: { userId: 'u1', symbol: 'BTC', type: 'crypto' },
      update: {},
    });
  });

  it('removes by userId + symbol (idempotent deleteMany)', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new WatchlistService({ watchlistItem: { deleteMany } } as any);

    await service.remove(actor, 'BTC');

    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', symbol: 'BTC' } });
  });
});
