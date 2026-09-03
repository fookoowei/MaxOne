import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

const config = { getOrThrow: () => 'secret' } as any;
const payload = { sub: 'u1', email: 'u1@x.com', role: 'user' };

describe('JwtStrategy.validate', () => {
  it('returns the AuthUser for an active user', async () => {
    const users = { findById: jest.fn().mockResolvedValue({ id: 'u1', status: 'active' }) };
    const strategy = new JwtStrategy(config, users as any);
    await expect(strategy.validate(payload)).resolves.toEqual({ id: 'u1', email: 'u1@x.com', role: 'user' });
  });
  it('rejects a suspended user', async () => {
    const users = { findById: jest.fn().mockResolvedValue({ id: 'u1', status: 'suspended' }) };
    const strategy = new JwtStrategy(config, users as any);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('rejects when the user is gone (findById throws)', async () => {
    const users = { findById: jest.fn().mockRejectedValue(new Error('not found')) };
    const strategy = new JwtStrategy(config, users as any);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
