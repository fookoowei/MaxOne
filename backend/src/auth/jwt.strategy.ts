import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

/** The shape of our access-token payload (set in TokensService.issueTokens). */
export interface JwtPayload {
  sub: string; // the user's id
  email: string;
  role: string; // the role name, e.g. 'user'
}

/** What we attach to request.user for downstream handlers to read. */
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  totpEnabled?: boolean; // set per request by JwtStrategy (M14c step-up reads it — zero extra queries)
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      // Pull the token from the "Authorization: Bearer <token>" header.
      // The BFF (Next.js) forwards the access token as a Bearer header server-side.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Reject expired tokens (this is what enforces the 15-minute lifetime).
      ignoreExpiration: false,
      // Verify the signature with the SAME secret we signed with.
      // getOrThrow: crash at boot if the secret is unset, never sign with undefined.
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Passport calls this ONLY after the signature + expiry are already verified.
   * Whatever we return becomes request.user. We reshape the raw payload into a
   * clean AuthUser so handlers don't deal with JWT jargon like `sub`.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    // Immediate revocation: a suspended (or deleted) user is rejected on the very next
    // request — the cost of Option A is this one indexed read on the access path.
    let user;
    try {
      user = await this.users.findById(payload.sub);
    } catch {
      throw new UnauthorizedException();
    }
    if (user.status !== 'active') throw new UnauthorizedException();
    return { id: payload.sub, email: payload.email, role: payload.role, totpEnabled: !!user.totpEnabled };
  }
}
