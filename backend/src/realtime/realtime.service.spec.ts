import { RealtimeService } from './realtime.service';

describe('RealtimeService.emitBalance', () => {
  it('emits balance.updated to the user room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    const gateway = { server: { to } } as any;
    const service = new RealtimeService(gateway);

    service.emitBalance('u1', { walletId: 'w1', currency: 'USD', balance: 9000 });

    expect(to).toHaveBeenCalledWith('user:u1');
    expect(emit).toHaveBeenCalledWith('balance.updated', { walletId: 'w1', currency: 'USD', balance: 9000 });
  });
});
