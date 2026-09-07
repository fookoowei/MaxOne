import { NotificationService } from './notification.service';
import { ROUTING_KEYS } from '../queue/events';

describe('NotificationService.notify', () => {
  const payload = { title: 'Deposit approved', body: '$100.00 added to your wallet', tag: 'x', url: '/' };

  it('emits over the socket AND publishes one notification.push event (push runs in the worker)', async () => {
    const realtime = { emitNotification: jest.fn() };
    const queue = { publish: jest.fn().mockReturnValue(true) };
    const svc = new NotificationService(realtime as any, queue as any);
    await svc.notify('u1', payload);
    expect(realtime.emitNotification).toHaveBeenCalledWith('u1', payload);
    expect(queue.publish).toHaveBeenCalledTimes(1);
    const [key, event] = queue.publish.mock.calls[0];
    expect(key).toBe(ROUTING_KEYS.notificationPush);
    expect(event).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      type: 'notification.push',
      occurredAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      userId: 'u1',
      payload,
    });
  });

  it('does not throw when publish returns false (broker down → socket still fired, push dropped)', async () => {
    const realtime = { emitNotification: jest.fn() };
    const queue = { publish: jest.fn().mockReturnValue(false) };
    const svc = new NotificationService(realtime as any, queue as any);
    await expect(svc.notify('u1', payload)).resolves.toBeUndefined();
    expect(realtime.emitNotification).toHaveBeenCalledTimes(1);
  });
});
