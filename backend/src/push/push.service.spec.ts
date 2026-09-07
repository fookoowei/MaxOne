import { PushService } from './push.service';
import * as webpush from 'web-push';

jest.mock('web-push', () => ({ setVapidDetails: jest.fn(), sendNotification: jest.fn() }));

const config = {
  getOrThrow: (k: string) =>
    ({ VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv', VAPID_SUBJECT: 'mailto:a@b.c' })[k],
};
const actor = { id: 'u1' } as any;

describe('PushService.subscribe', () => {
  it('upserts on endpoint (idempotent)', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 's1' });
    const svc = new PushService({ pushSubscription: { upsert } } as any, config as any);
    await svc.subscribe(actor, { endpoint: 'https://e/1', keys: { p256dh: 'p', auth: 'a' } });
    expect(upsert).toHaveBeenCalledWith({
      where: { endpoint: 'https://e/1' },
      create: { userId: 'u1', endpoint: 'https://e/1', p256dh: 'p', auth: 'a' },
      update: { userId: 'u1', p256dh: 'p', auth: 'a' },
    });
  });
});

describe('PushService.unsubscribe', () => {
  it('deletes scoped to endpoint AND userId', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const svc = new PushService({ pushSubscription: { deleteMany } } as any, config as any);
    await svc.unsubscribe(actor, 'https://e/1');
    expect(deleteMany).toHaveBeenCalledWith({ where: { endpoint: 'https://e/1', userId: 'u1' } });
  });
});

describe('PushService.sendToUser', () => {
  it('sends a notification to each subscription', async () => {
    const findMany = jest.fn().mockResolvedValue([{ endpoint: 'https://e/1', p256dh: 'p', auth: 'a' }]);
    (webpush.sendNotification as jest.Mock).mockResolvedValue({});
    const svc = new PushService({ pushSubscription: { findMany } } as any, config as any);
    await svc.sendToUser('u1', { title: 'Deposit approved', body: '$100.00 added to your wallet' });
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
  });

  it('prunes a subscription when the endpoint is gone (410)', async () => {
    const findMany = jest.fn().mockResolvedValue([{ endpoint: 'https://dead', p256dh: 'p', auth: 'a' }]);
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    (webpush.sendNotification as jest.Mock).mockRejectedValue({ statusCode: 410 });
    const svc = new PushService({ pushSubscription: { findMany, deleteMany } } as any, config as any);
    await svc.sendToUser('u1', { title: 'x', body: 'y' });
    expect(deleteMany).toHaveBeenCalledWith({ where: { endpoint: 'https://dead' } });
  });

  it('throws after trying every subscription when a send fails transiently (5xx/network) — so the queue retries', async () => {
    const prisma = {
      pushSubscription: {
        findMany: jest.fn().mockResolvedValue([
          { endpoint: 'https://push/a', p256dh: 'k', auth: 'a' },
          { endpoint: 'https://push/b', p256dh: 'k', auth: 'a' },
        ]),
        deleteMany: jest.fn(),
      },
    };
    const svc = new PushService(prisma as any, config as any);
    (webpush.sendNotification as jest.Mock).mockReset(); // earlier tests leave calls + defaults behind
    (webpush.sendNotification as jest.Mock)
      .mockRejectedValueOnce({ statusCode: 503, message: 'Service Unavailable' })
      .mockResolvedValueOnce(undefined);
    await expect(svc.sendToUser('u1', { title: 'x', body: 'y' })).rejects.toThrow(/push failed for 1\/2/);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2); // the second one was still attempted
    expect(prisma.pushSubscription.deleteMany).not.toHaveBeenCalled(); // 503 is not a prune
  });
});
