import { TokensService } from './tokens.service';

describe('TokensService.issueWsTicket', () => {
  it('signs a short-lived ws-purpose ticket for the user', async () => {
    const jwt = { signAsync: jest.fn().mockResolvedValue('ticket.jwt') };
    const service = new TokensService(jwt as any, {} as any);

    const ticket = await service.issueWsTicket('u1');

    expect(ticket).toBe('ticket.jwt');
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1', purpose: 'ws' }, { expiresIn: '60s' });
  });
});
