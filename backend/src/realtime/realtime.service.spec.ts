import { RealtimeService } from './realtime.service';
import type { RealtimeGateway } from './realtime.gateway';

function buildService(size = 0) {
  const emit = jest.fn();
  const to = jest.fn().mockReturnValue({ emit });
  const gateway = {
    server: {
      emit,
      to,
      sockets: { sockets: new Map(Array.from({ length: size }, (_, i) => [String(i), {}])) },
    },
  } as unknown as RealtimeGateway;
  return { service: new RealtimeService(gateway), emit };
}

describe('RealtimeService.broadcastPrices', () => {
  it('emits prices.updated with the assets to all sockets', () => {
    const { service, emit } = buildService();
    const assets = [
      { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 43000, change24h: 2 },
    ];
    service.broadcastPrices(assets as any);
    expect(emit).toHaveBeenCalledWith('prices.updated', assets);
  });
});

describe('RealtimeService.connectedCount', () => {
  it('returns the number of connected sockets', () => {
    expect(buildService(0).service.connectedCount()).toBe(0);
    expect(buildService(3).service.connectedCount()).toBe(3);
  });
});

describe('RealtimeService.emitAlert', () => {
  it('emits alert.triggered to the owner room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    const gateway = { server: { emit, to, sockets: { sockets: new Map() } } } as unknown as RealtimeGateway;
    const service = new RealtimeService(gateway);
    const payload = { id: 'a1', symbol: 'BTC', direction: 'above', targetPrice: 80000, price: 80120 };
    service.emitAlert('u1', payload);
    expect(to).toHaveBeenCalledWith('user:u1');
    expect(emit).toHaveBeenCalledWith('alert.triggered', payload);
  });
});
