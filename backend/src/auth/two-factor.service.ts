import { Injectable, UnauthorizedException } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';

const ISSUER = 'MaxOne';
const RECOVERY_COUNT = 8;
// Recovery codes are high-entropy random strings, so a fast sha256 is the right hash
// (bcrypt's slowness only matters for low-entropy human passwords).
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const normalize = (code: string) => code.trim().toLowerCase().replace(/\s+/g, '');

@Injectable()
export class TwoFactorService {
  constructor(private readonly users: UsersService) {}

  // Step 1: mint a secret, store it PENDING, hand back the otpauth URI + QR to scan.
  async setup(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    await this.users.setTotpPending(userId, secret);
    const otpauthUrl = authenticator.keyuri(email, ISSUER, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { otpauthUrl, qrDataUrl };
  }

  // Step 2: prove the authenticator works, then enable + issue one-time recovery codes.
  async verifyAndEnable(userId: string, code: string) {
    const user = await this.users.findByIdRaw(userId);
    if (!user?.totpSecret || !authenticator.check(normalize(code), user.totpSecret)) {
      throw new UnauthorizedException('Invalid code');
    }
    const recoveryCodes = Array.from({ length: RECOVERY_COUNT }, () => randomBytes(5).toString('hex'));
    await this.users.enableTotp(userId, recoveryCodes.map(sha256));
    return { recoveryCodes }; // plaintext, shown ONCE
  }

  async disable(userId: string, code: string) {
    const user = await this.users.findByIdRaw(userId);
    if (!user?.totpEnabled || !user.totpSecret || !authenticator.check(normalize(code), user.totpSecret)) {
      throw new UnauthorizedException('Invalid code');
    }
    await this.users.disableTotp(userId);
  }

  async status(userId: string) {
    const user = await this.users.findByIdRaw(userId);
    return { enabled: !!user?.totpEnabled };
  }

  // Login step: a live TOTP code OR an unused recovery code (consumed on use).
  async verifyForLogin(userId: string, code: string): Promise<boolean> {
    const user = await this.users.findByIdRaw(userId);
    if (!user?.totpEnabled || !user.totpSecret) return false;
    const c = normalize(code);
    if (authenticator.check(c, user.totpSecret)) return true;
    const h = sha256(c);
    if (user.totpRecoveryHashes.includes(h)) {
      await this.users.consumeRecoveryHash(userId, h);
      return true;
    }
    return false;
  }
}
