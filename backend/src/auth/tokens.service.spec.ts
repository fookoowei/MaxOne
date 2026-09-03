import { UnauthorizedException } from '@nestjs/common';
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

const userRow = { id: 'u1', email: 'u1@x.com', role: { name: 'user' } };
function tokensWith(refreshToken: any) {
  const jwt = { signAsync: jest.fn().mockResolvedValue('access.jwt') };
  const prisma = { refreshToken };
  return { service: new TokensService(jwt as any, prisma as any), prisma };
}

describe('TokensService.issueTokens family', () => {
  it('mints a NEW family on a fresh login', async () => {
    const create = jest.fn().mockResolvedValue({});
    const { service } = tokensWith({ create });
    await service.issueTokens(userRow);
    expect(create.mock.calls[0][0].data.familyId).toEqual(expect.any(String));
  });
  it('reuses the family when one is passed', async () => {
    const create = jest.fn().mockResolvedValue({});
    const { service } = tokensWith({ create });
    await service.issueTokens(userRow, 'fam-1');
    expect(create.mock.calls[0][0].data.familyId).toBe('fam-1');
  });
});

describe('TokensService.rotate reuse detection', () => {
  const base = { id: 'rt1', familyId: 'fam-1', expiresAt: new Date(Date.now() + 1e6), user: userRow };

  it('marks the token used and reissues in the same family', async () => {
    const create = jest.fn().mockResolvedValue({});
    const update = jest.fn().mockResolvedValue({});
    const findUnique = jest.fn().mockResolvedValue({ ...base, usedAt: null });
    const { service } = tokensWith({ findUnique, update, create, delete: jest.fn(), deleteMany: jest.fn() });
    await service.rotate('raw');
    expect(update).toHaveBeenCalledWith({ where: { id: 'rt1' }, data: { usedAt: expect.any(Date) } });
    expect(create.mock.calls[0][0].data.familyId).toBe('fam-1');
  });

  it('revokes the whole family when an already-used token is presented (reuse)', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 2 });
    const findUnique = jest.fn().mockResolvedValue({ ...base, usedAt: new Date() });
    const { service } = tokensWith({ findUnique, deleteMany, update: jest.fn(), create: jest.fn(), delete: jest.fn() });
    await expect(service.rotate('raw')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(deleteMany).toHaveBeenCalledWith({ where: { familyId: 'fam-1' } });
  });

  it('rejects an expired token', async () => {
    const del = jest.fn().mockResolvedValue({});
    const findUnique = jest.fn().mockResolvedValue({ ...base, usedAt: null, expiresAt: new Date(Date.now() - 1) });
    const { service } = tokensWith({ findUnique, delete: del, update: jest.fn(), create: jest.fn(), deleteMany: jest.fn() });
    await expect(service.rotate('raw')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(del).toHaveBeenCalledWith({ where: { id: 'rt1' } });
  });

  it('rejects an unknown token', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const { service } = tokensWith({ findUnique });
    await expect(service.rotate('raw')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
