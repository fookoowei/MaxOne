import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { authenticator } from 'otplib';
import { TwoFactorService } from './two-factor.service';

jest.mock('otplib', () => ({
  authenticator: { generateSecret: jest.fn(() => 'SECRET'), keyuri: jest.fn(() => 'otpauth://totp/x'), check: jest.fn() },
}));
jest.mock('qrcode', () => ({ toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,qr') }));

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const check = authenticator.check as jest.Mock;

function build(userRow: any) {
  const users = {
    findByIdRaw: jest.fn().mockResolvedValue(userRow && { id: 'u1', ...userRow }),
    setTotpPending: jest.fn().mockResolvedValue({}),
    enableTotp: jest.fn().mockResolvedValue({}),
    disableTotp: jest.fn().mockResolvedValue({}),
    consumeRecoveryHash: jest.fn().mockResolvedValue({}),
  };
  return { svc: new TwoFactorService(users as any), users };
}

beforeEach(() => check.mockReset());

describe('TwoFactorService.setup', () => {
  it('refuses when 2FA is already enabled (no silent downgrade)', async () => {
    const { svc, users } = build({ totpSecret: 'SECRET', totpEnabled: true, totpRecoveryHashes: [] });
    await expect(svc.setup('u1', 'a@b.c')).rejects.toBeInstanceOf(ConflictException);
    expect(users.setTotpPending).not.toHaveBeenCalled();
  });
  it('stores a pending secret and returns the otpauth URI + QR', async () => {
    const { svc, users } = build(null);
    const out = await svc.setup('u1', 'a@b.c');
    expect(users.setTotpPending).toHaveBeenCalledWith('u1', 'SECRET');
    expect(out).toEqual({ otpauthUrl: 'otpauth://totp/x', qrDataUrl: 'data:image/png;base64,qr' });
  });
});

describe('TwoFactorService.verifyAndEnable', () => {
  it('rejects a wrong code', async () => {
    check.mockReturnValue(false);
    const { svc } = build({ totpSecret: 'SECRET', totpEnabled: false });
    await expect(svc.verifyAndEnable('u1', '000000')).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('enables and returns 8 recovery codes, storing their hashes', async () => {
    check.mockReturnValue(true);
    const { svc, users } = build({ totpSecret: 'SECRET', totpEnabled: false });
    const { recoveryCodes } = await svc.verifyAndEnable('u1', '123456');
    expect(recoveryCodes).toHaveLength(8);
    const hashes = users.enableTotp.mock.calls[0][1] as string[];
    expect(hashes).toEqual(recoveryCodes.map(sha));
  });
});

describe('TwoFactorService.verifyForLogin', () => {
  const enabled = { totpSecret: 'SECRET', totpEnabled: true, totpRecoveryHashes: [sha('abcdef1234')] };
  it('accepts a valid TOTP code', async () => {
    check.mockReturnValue(true);
    expect(await build(enabled).svc.verifyForLogin('u1', '123456')).toBe(true);
  });
  it('accepts an unused recovery code and consumes it', async () => {
    check.mockReturnValue(false);
    const { svc, users } = build(enabled);
    expect(await svc.verifyForLogin('u1', 'ABCDEF1234')).toBe(true); // normalized
    expect(users.consumeRecoveryHash).toHaveBeenCalledWith('u1', sha('abcdef1234'));
  });
  it('rejects when neither matches', async () => {
    check.mockReturnValue(false);
    expect(await build(enabled).svc.verifyForLogin('u1', 'nope')).toBe(false);
  });
  it('rejects when 2FA is not enabled', async () => {
    check.mockReturnValue(true);
    expect(await build({ totpSecret: 'S', totpEnabled: false, totpRecoveryHashes: [] }).svc.verifyForLogin('u1', '1')).toBe(false);
  });
});

describe('TwoFactorService.disable', () => {
  it('accepts a recovery code (consumed) so a lost-phone user can turn 2FA off and re-enroll', async () => {
    check.mockReturnValue(false); // no authenticator anymore
    const { svc, users } = build({ id: 'u1', totpSecret: 'SECRET', totpEnabled: true, totpRecoveryHashes: [sha('abcdef1234')] });
    await svc.disable('u1', 'ABCDEF1234');
    expect(users.consumeRecoveryHash).toHaveBeenCalledWith('u1', sha('abcdef1234'));
    expect(users.disableTotp).toHaveBeenCalledWith('u1');
  });
  it('requires a valid current code, then clears', async () => {
    check.mockReturnValue(true);
    const { svc, users } = build({ totpSecret: 'SECRET', totpEnabled: true, totpRecoveryHashes: [] });
    await svc.disable('u1', '123456');
    expect(users.disableTotp).toHaveBeenCalledWith('u1');
  });
  it('rejects a bad code', async () => {
    check.mockReturnValue(false);
    await expect(build({ totpSecret: 'SECRET', totpEnabled: true, totpRecoveryHashes: [] }).svc.disable('u1', 'x')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
