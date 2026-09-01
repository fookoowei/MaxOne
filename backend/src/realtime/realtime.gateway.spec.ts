import { RealtimeGateway } from './realtime.gateway';

function mockClient(ticket: unknown) {
  return {
    handshake: { auth: { ticket } },
    join: jest.fn(),
    disconnect: jest.fn(),
  } as any;
}

describe('RealtimeGateway.handleConnection', () => {
  it('joins the user room when the ticket is valid', async () => {
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'u1', purpose: 'ws' }) };
    const gateway = new RealtimeGateway(jwt as any);
    const client = mockClient('good.ticket');

    await gateway.handleConnection(client);

    expect(client.join).toHaveBeenCalledWith('user:u1');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('disconnects when the ticket is invalid', async () => {
    const jwt = { verifyAsync: jest.fn().mockRejectedValue(new Error('bad')) };
    const gateway = new RealtimeGateway(jwt as any);
    const client = mockClient('bad');

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
  });

  it('disconnects when the token purpose is not ws', async () => {
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'u1', purpose: 'access' }) };
    const gateway = new RealtimeGateway(jwt as any);
    const client = mockClient('access.token');

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalled();
  });
});
