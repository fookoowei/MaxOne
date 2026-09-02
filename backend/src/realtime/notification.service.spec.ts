import { NotificationService } from './notification.service';

describe('NotificationService.notify', () => {
  it('emits over the socket AND sends a web push', async () => {
    const realtime = { emitNotification: jest.fn() };
    const push = { sendToUser: jest.fn().mockResolvedValue(undefined) };
    const svc = new NotificationService(realtime as any, push as any);
    const payload = { title: 'Deposit approved', body: '$100.00 added to your wallet', tag: 'x', url: '/' };
    await svc.notify('u1', payload);
    expect(realtime.emitNotification).toHaveBeenCalledWith('u1', payload);
    expect(push.sendToUser).toHaveBeenCalledWith('u1', payload);
  });
});
