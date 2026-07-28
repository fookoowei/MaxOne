import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

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
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      // Prefer the httpOnly access_token cookie (the browser flow); fall back to the
      // "Authorization: Bearer <token>" header so curl / tests still work.
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => (req?.cookies?.['access_token'] as string | undefined) ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
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
  validate(payload: JwtPayload): AuthUser {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
