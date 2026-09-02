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
    await svc.sendToUser('u1', { id: 'x', symbol: 'BTC', direction: 'above', targetPrice: 80000, price: 80500 });
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
  });

  it('prunes a subscription when the endpoint is gone (410)', async () => {
    const findMany = jest.fn().mockResolvedValue([{ endpoint: 'https://dead', p256dh: 'p', auth: 'a' }]);
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    (webpush.sendNotification as jest.Mock).mockRejectedValue({ statusCode: 410 });
    const svc = new PushService({ pushSubscription: { findMany, deleteMany } } as any, config as any);
    await svc.sendToUser('u1', { id: 'x', symbol: 'BTC', direction: 'above', targetPrice: 1, price: 2 });
    expect(deleteMany).toHaveBeenCalledWith({ where: { endpoint: 'https://dead' } });
  });
});
