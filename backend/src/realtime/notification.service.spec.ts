import { NotificationService } from './notification.service';
import { ROUTING_KEYS } from '../queue/events';
import { auditContext } from '../audit/audit.context';

describe('NotificationService (M16d: enqueue in-tx / dispatch after commit)', () => {
  const payload = { title: 'Deposit approved', body: '$100.00 added to your wallet', tag: 'x', url: '/' };

  function build() {
    const realtime = { emitNotification: jest.fn() };
    const outbox = { enqueue: jest.fn().mockResolvedValue(undefined), publishNow: jest.fn().mockResolvedValue(true) };
    return { realtime, outbox, svc: new NotificationService(realtime as any, outbox as any) };
  }

  it('enqueue: builds the event and writes it through the CALLER\'s tx via the outbox; no socket, no publish yet', async () => {
    const { svc, realtime, outbox } = build();
    const tx = { tag: 'tx' };
    const event = await svc.enqueue(tx as any, 'u1', payload);
    expect(event).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      type: 'notification.push',
      occurredAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      userId: 'u1',
      payload,
    });
    expect(outbox.enqueue).toHaveBeenCalledWith(tx, ROUTING_KEYS.notificationPush, event);
    expect(realtime.emitNotification).not.toHaveBeenCalled();
    expect(outbox.publishNow).not.toHaveBeenCalled();
  });

  it('enqueue: stamps the current request id onto the event (M17 correlation); absent outside a request', async () => {
    const { svc } = build();
    const inside = await auditContext.run(
      { requestId: 'req-42', ipAddress: null, userAgent: null },
      () => svc.enqueue({} as any, 'u1', payload),
    );
    expect(inside.requestId).toBe('req-42');
    const outside = await svc.enqueue({} as any, 'u1', payload);
    expect(outside.requestId).toBeUndefined();
  });

  it('dispatch: socket toast + publishNow with the event as the outbox row', async () => {
    const { svc, realtime, outbox } = build();
    const event = { id: 'e1', type: 'notification.push' as const, occurredAt: 'now', userId: 'u1', payload };
    await svc.dispatch(event);
    expect(realtime.emitNotification).toHaveBeenCalledWith('u1', payload);
    expect(outbox.publishNow).toHaveBeenCalledWith({ id: 'e1', routingKey: ROUTING_KEYS.notificationPush, payload: event });
  });

  it('dispatch never throws (broker down → publishNow false; socket throw swallowed)', async () => {
    const { svc, realtime, outbox } = build();
    realtime.emitNotification.mockImplementation(() => { throw new Error('no gateway'); });
    outbox.publishNow.mockResolvedValue(false);
    const event = { id: 'e1', type: 'notification.push' as const, occurredAt: 'now', userId: 'u1', payload };
    await expect(svc.dispatch(event)).resolves.toBeUndefined();
  });
});
