import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as swa from '@simplewebauthn/server';
import { PasskeysService } from './passkeys.service';

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn().mockResolvedValue({ challenge: 'REG-CHAL', rp: { id: 'localhost' } }),
  verifyRegistrationResponse: jest.fn(),
  generateAuthenticationOptions: jest.fn().mockResolvedValue({ challenge: 'AUTH-CHAL' }),
  verifyAuthenticationResponse: jest.fn(),
}));

const config = { get: (k: string) => ({ WEBAUTHN_RP_ID: 'localhost', WEBAUTHN_RP_NAME: 'MaxOne', WEBAUTHN_ORIGIN: 'http://localhost:3300' })[k] };
function build(passkey: any = {}, tokens: any = {}) {
  const prisma = { passkey: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), deleteMany: jest.fn(), ...passkey } };
  const tok = { issueWebAuthnChallenge: jest.fn().mockResolvedValue('chal.jwt'), verifyWebAuthnChallenge: jest.fn(), ...tokens };
  return { svc: new PasskeysService(prisma as any, tok as any, config as any), prisma, tok };
}

describe('PasskeysService registration', () => {
  it('returns options for our RP + a challenge token bound to the user, excluding existing passkeys', async () => {
    const { svc, tok } = build({ findMany: jest.fn().mockResolvedValue([{ credentialId: 'old', transports: ['internal'] }]) });
    const out = await svc.registrationOptions({ id: 'u1', email: 'a@b.c' });
    expect(out.challengeToken).toBe('chal.jwt');
    expect(tok.issueWebAuthnChallenge).toHaveBeenCalledWith('REG-CHAL', 'u1');
    const args = (swa.generateRegistrationOptions as jest.Mock).mock.calls[0][0];
    expect(args.rpID).toBe('localhost');
    expect(args.excludeCredentials).toEqual([{ id: 'old', transports: ['internal'] }]);
  });

  it('saves the public key + counter from registrationInfo.credential', async () => {
    (swa.verifyRegistrationResponse as jest.Mock).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: { id: 'cred1', publicKey: new Uint8Array([1, 2, 3]), counter: 0, transports: ['internal'] },
        credentialDeviceType: 'singleDevice', credentialBackedUp: false,
      },
    });
    const create = jest.fn().mockResolvedValue({ id: 'pk1' });
    const { svc } = build({ create }, { verifyWebAuthnChallenge: jest.fn().mockResolvedValue({ challenge: 'REG-CHAL', userId: 'u1' }) });
    await svc.verifyRegistration('u1', { id: 'cred1' } as any, 'chal.jwt', 'MacBook');
    expect(create.mock.calls[0][0].data).toMatchObject({ userId: 'u1', credentialId: 'cred1', counter: 0, transports: ['internal'], deviceType: 'singleDevice', label: 'MacBook' });
    expect((swa.verifyRegistrationResponse as jest.Mock).mock.calls[0][0]).toMatchObject({ expectedChallenge: 'REG-CHAL', expectedOrigin: 'http://localhost:3300', expectedRPID: 'localhost' });
  });

  it('rejects a challenge that was issued to a different user', async () => {
    const { svc, prisma } = build({}, { verifyWebAuthnChallenge: jest.fn().mockResolvedValue({ challenge: 'REG-CHAL', userId: 'u2' }) });
    await expect(svc.verifyRegistration('u1', {} as any, 'chal.jwt')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.passkey.create).not.toHaveBeenCalled();
  });
});

describe('PasskeysService authentication', () => {
  const row = { id: 'pk1', userId: 'u1', credentialId: 'cred1', publicKey: new Uint8Array([1]), counter: 3, transports: ['internal'] };

  it('issues a usernameless challenge (no user bound)', async () => {
    const { svc, tok } = build();
    const out = await svc.authenticationOptions();
    expect(out.challengeToken).toBe('chal.jwt');
    expect(tok.issueWebAuthnChallenge).toHaveBeenCalledWith('AUTH-CHAL');
  });

  it('verifies, bumps the counter, and returns the owning userId', async () => {
    (swa.verifyAuthenticationResponse as jest.Mock).mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 4 } });
    const update = jest.fn().mockResolvedValue({});
    const { svc } = build({ findUnique: jest.fn().mockResolvedValue(row), update }, { verifyWebAuthnChallenge: jest.fn().mockResolvedValue({ challenge: 'AUTH-CHAL' }) });
    expect(await svc.verifyAuthentication({ id: 'cred1' } as any, 'chal.jwt')).toBe('u1');
    expect(update).toHaveBeenCalledWith({ where: { id: 'pk1' }, data: { counter: 4, lastUsedAt: expect.any(Date) } });
    expect((swa.verifyAuthenticationResponse as jest.Mock).mock.calls[0][0].credential).toMatchObject({ id: 'cred1', counter: 3 });
  });

  it('rejects an unknown credential', async () => {
    const { svc } = build({ findUnique: jest.fn().mockResolvedValue(null) }, { verifyWebAuthnChallenge: jest.fn().mockResolvedValue({ challenge: 'AUTH-CHAL' }) });
    await expect(svc.verifyAuthentication({ id: 'nope' } as any, 'chal.jwt')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('step-up: rejects a passkey that belongs to another user', async () => {
    const { svc } = build({ findUnique: jest.fn().mockResolvedValue(row) }, { verifyWebAuthnChallenge: jest.fn().mockResolvedValue({ challenge: 'AUTH-CHAL' }) });
    await expect(svc.verifyAuthentication({ id: 'cred1' } as any, 'chal.jwt', 'u2')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('PasskeysService.remove', () => {
  it('deletes only your own passkey; 404 otherwise', async () => {
    const { svc, prisma } = build({ deleteMany: jest.fn().mockResolvedValue({ count: 0 }) });
    await expect(svc.remove('u1', 'pk9')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.passkey.deleteMany).toHaveBeenCalledWith({ where: { id: 'pk9', userId: 'u1' } });
  });
});
