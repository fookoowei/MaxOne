import { toSafeUser } from './to-safe-user';

describe('toSafeUser', () => {
  it('strips the password hash AND the 2FA secrets, keeps everything else', () => {
    const safe = toSafeUser({
      id: 'u1', email: 'a@b.c', status: 'active', totpEnabled: true,
      passwordHash: 'h', totpSecret: 'S', totpRecoveryHashes: ['x'],
    });
    expect(safe).toEqual({ id: 'u1', email: 'a@b.c', status: 'active', totpEnabled: true });
    expect(safe).not.toHaveProperty('passwordHash');
    expect(safe).not.toHaveProperty('totpSecret');
    expect(safe).not.toHaveProperty('totpRecoveryHashes');
  });
});
