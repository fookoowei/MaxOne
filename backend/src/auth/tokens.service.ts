import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

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

  // A short-lived, single-purpose token the browser presents when opening the WebSocket
  // directly to the backend (the httpOnly access cookie can't ride a cross-origin socket).
  issueWsTicket(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId, purpose: 'ws' }, { expiresIn: '60s' });
  }

  async issueTokens(
    user: { id: string; email: string; role: { name: string } },
    // Fresh login → a new family; rotation passes the existing family so the session's
    // tokens stay linked (reuse of any one revokes them all).
    familyId: string = randomUUID(),
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
    await this.prisma.refreshToken.create({
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

    // Reuse: already rotated once → a replay. Revoke the whole family.
    if (existing.usedAt) {
      await this.prisma.refreshToken.deleteMany({ where: { familyId: existing.familyId } });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    // Expired: clean up the stale row and reject.
    if (existing.expiresAt.getTime() < Date.now()) {
      await this.prisma.refreshToken.delete({ where: { id: existing.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Mark used (not delete) so a replay is detectable; reissue in the SAME family.
    await this.prisma.refreshToken.update({ where: { id: existing.id }, data: { usedAt: new Date() } });
    return this.issueTokens(existing.user, existing.familyId);
  }

  /** Log out one device: delete its refresh-token row. Idempotent. */
  async revoke(rawRefreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash: this.hash(rawRefreshToken) },
    });
  }
}
