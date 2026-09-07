import { HealthService } from './health.service';

function build(o: { db?: boolean; redis?: boolean; rabbit?: boolean; dead?: number | null; pending?: number } = {}) {
  const prisma = {
    $queryRaw: jest.fn().mockImplementation(() => (o.db === false ? Promise.reject(new Error('down')) : Promise.resolve([{ 1: 1 }]))),
    outboxEvent: { count: jest.fn().mockResolvedValue(o.pending ?? 0) },
  };
  const cache = { ping: jest.fn().mockResolvedValue(o.redis !== false) };
  const queue = { depth: jest.fn().mockResolvedValue(o.dead === undefined ? 0 : o.dead), isConnected: jest.fn().mockReturnValue(o.rabbit !== false) };
  return new HealthService(prisma as any, cache as any, queue as any);
}

describe('HealthService (M17)', () => {
  it('everything up → ok with the M16 numbers', async () => {
    expect(await build({ dead: 2, pending: 1 }).check()).toEqual({
      status: 'ok', db: 'up', redis: 'up', rabbitmq: 'up', outboxPending: 1, deadLetters: 2,
    });
  });
  it('redis or rabbitmq down → degraded, db still up', async () => {
    expect((await build({ redis: false }).check())).toMatchObject({ status: 'degraded', redis: 'down', db: 'up' });
    expect((await build({ rabbit: false, dead: null }).check())).toMatchObject({ status: 'degraded', rabbitmq: 'down', deadLetters: null });
  });
  it('postgres down → db down (the controller turns this into a 503)', async () => {
    expect(await build({ db: false }).check()).toMatchObject({ status: 'degraded', db: 'down' });
  });
});
