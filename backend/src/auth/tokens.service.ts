import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

const REFRESH_TTL_DAYS = 7;

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /** Deterministic hash so we can look a token up by its hash later. */
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // ── Short-lived, single-purpose JWTs. One helper, three uses: the WS ticket (open a socket
  // directly to the backend), the 2FA login challenge, and the step-up grant. A `purpose`
  // claim means none of them can ever be presented as an access token — and none can be
  // presented as each other. ──
  private issuePurpose(
    userId: string,
    purpose: string,
    expiresIn: JwtSignOptions['expiresIn'],
  ): Promise<string> {
    return this.jwt.signAsync({ sub: userId, purpose }, { expiresIn });
  }

  private async verifyPurpose(token: string, purpose: string): Promise<string> {
    try {
      const p = await this.jwt.verifyAsync<{ sub: string; purpose?: string }>(token);
      if (p.purpose !== purpose) throw new Error('wrong purpose');
      return p.sub;
    } catch {
      throw new UnauthorizedException(`Invalid or expired ${purpose} token`);
    }
  }

  issueWsTicket(userId: string): Promise<string> {
    return this.issuePurpose(userId, 'ws', '60s');
  }

  // Step-up grant: proves the second factor was re-verified moments ago (for sensitive actions).
  issueStepUpGrant(userId: string): Promise<string> {
    return this.issuePurpose(userId, 'step-up', '5m');
  }

  verifyStepUpGrant(token: string): Promise<string> {
    return this.verifyPurpose(token, 'step-up');
  }

  async issueTokens(
    user: { id: string; email: string; role: { name: string } },
    // Fresh login → a new family; rotation passes the existing family so the session's
    // tokens stay linked (reuse of any one revokes them all).
    familyId: string = randomUUID(),
    // Rotation passes its transaction client so the new token commits together with the claim.
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    // Access token: a stateless, signed JWT (verified by signature alone, no DB).
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role.name,
    });

    // Refresh token: an opaque random string. Its authority lives in the DB row,
    // and we store only its SHA-256 hash — never the raw value.
    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    await db.refreshToken.create({
      data: {
        tokenHash: this.hash(refreshToken),
        userId: user.id,
        familyId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Exchange a valid refresh token for a fresh pair. A token is single-use: rotating it
   * marks it `usedAt` (kept, not deleted) so that a later presentation is detectable as a
   * REPLAY — which revokes the entire family, logging out victim and attacker alike.
   */
  async rotate(rawRefreshToken: string) {
    const tokenHash = this.hash(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { role: true } } },
    });

    // No row = unknown or revoked token.
    if (!existing) throw new UnauthorizedException('Invalid refresh token');

    // Fast-path reuse: already rotated once → a replay. Revoke the whole family.
    if (existing.usedAt) {
      await this.prisma.refreshToken.deleteMany({ where: { familyId: existing.familyId } });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    // Expired: clean up the stale row and reject.
    if (existing.expiresAt.getTime() < Date.now()) {
      await this.prisma.refreshToken.delete({ where: { id: existing.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Atomically CLAIM the token: a single conditional update (usedAt still null) closes the
    // TOCTOU race — two simultaneous refreshes of the same token can't both win. The claim and
    // the NEW token are committed in ONE transaction: a concurrent loser's updateMany waits on
    // the row lock until this commits, so its family-revoke below always sees (and deletes)
    // the winner's fresh token too — a raced rotation leaves NO live token behind.
    // (Found by the M15b real-DB test: without the transaction the loser's revoke could run
    // before the winner's create, leaving one token alive.)
    const issued = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.updateMany({
        where: { id: existing.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count === 0) return null; // loser — handled (and committed) outside the tx
      return this.issueTokens(existing.user, existing.familyId, tx);
    });
    if (!issued) {
      await this.prisma.refreshToken.deleteMany({ where: { familyId: existing.familyId } });
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    return issued;
  }

  /** Log out one device: delete its refresh-token row. Idempotent. */
  async revoke(rawRefreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash: this.hash(rawRefreshToken) },
    });
  }

  // 2FA challenge: proves "password already verified" for the second login step.
  issue2faChallenge(userId: string): Promise<string> {
    return this.issuePurpose(userId, '2fa', '5m');
  }

  verify2faChallenge(token: string): Promise<string> {
    return this.verifyPurpose(token, '2fa');
  }

  // WebAuthn ceremonies: the challenge must survive between the *options* call and the
  // *verify* call. We sign it into a short-lived JWT instead of storing it — stateless, like
  // every other purpose token here. `userId` is set for registration/step-up (bound to the
  // caller) and absent for usernameless login.
  issueWebAuthnChallenge(challenge: string, userId?: string): Promise<string> {
    return this.jwt.signAsync(
      { ...(userId ? { sub: userId } : {}), purpose: 'webauthn', challenge },
      { expiresIn: '5m' },
    );
  }

  async verifyWebAuthnChallenge(token: string): Promise<{ challenge: string; userId?: string }> {
    try {
      const p = await this.jwt.verifyAsync<{ sub?: string; purpose?: string; challenge?: string }>(token);
      if (p.purpose !== 'webauthn' || !p.challenge) throw new Error('bad challenge token');
      return { challenge: p.challenge, userId: p.sub };
    } catch {
      throw new UnauthorizedException('Invalid or expired WebAuthn challenge');
    }
  }
}
