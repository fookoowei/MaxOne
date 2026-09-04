import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransport,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { PrismaService } from '../prisma/prisma.service';
import { TokensService } from './tokens.service';

// WebAuthn / passkeys. We hold ONLY public keys; the private key lives in the device's secure
// enclave and never leaves it. Challenges ride a signed 5-minute JWT (stateless) between the
// *options* call and the *verify* call.
@Injectable()
export class PasskeysService {
  private readonly rpID: string;
  private readonly rpName: string;
  private readonly origin: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    config: ConfigService,
  ) {
    this.rpID = config.get<string>('WEBAUTHN_RP_ID') ?? 'localhost';
    this.rpName = config.get<string>('WEBAUTHN_RP_NAME') ?? 'MaxOne';
    this.origin = config.get<string>('WEBAUTHN_ORIGIN') ?? 'http://localhost:3300';
  }

  // ── Registration ──
  async registrationOptions(user: { id: string; email: string }) {
    const existing = await this.prisma.passkey.findMany({
      where: { userId: user.id },
      select: { credentialId: true, transports: true },
    });
    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: new TextEncoder().encode(user.id), // stable handle → one user record per device
      userName: user.email,
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports: c.transports as AuthenticatorTransport[],
      })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    });
    const challengeToken = await this.tokens.issueWebAuthnChallenge(options.challenge, user.id);
    return { options, challengeToken };
  }

  async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    challengeToken: string,
    label?: string,
  ) {
    const { challenge, userId: bound } = await this.tokens.verifyWebAuthnChallenge(challengeToken);
    if (bound !== userId) throw new UnauthorizedException('Challenge does not belong to this user');
    const result = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
    });
    if (!result.verified || !result.registrationInfo) {
      throw new UnauthorizedException('Passkey registration failed');
    }
    const { credential, credentialDeviceType, credentialBackedUp } = result.registrationInfo;
    return this.prisma.passkey.create({
      data: {
        userId,
        credentialId: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        transports: credential.transports ?? [],
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        label: label ?? null,
      },
      select: { id: true, label: true, deviceType: true, createdAt: true },
    });
  }

  // ── Authentication (login + step-up) ──
  // Usernameless: no allowCredentials — the device offers its passkeys for this RP.
  async authenticationOptions() {
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: 'preferred',
    });
    const challengeToken = await this.tokens.issueWebAuthnChallenge(options.challenge);
    return { options, challengeToken };
  }

  // Returns the owning userId. `expectUserId` binds a step-up ceremony to the caller.
  async verifyAuthentication(
    response: AuthenticationResponseJSON,
    challengeToken: string,
    expectUserId?: string,
  ): Promise<string> {
    const { challenge } = await this.tokens.verifyWebAuthnChallenge(challengeToken);
    const passkey = await this.prisma.passkey.findUnique({ where: { credentialId: response.id } });
    if (!passkey) throw new UnauthorizedException('Unknown passkey');
    if (expectUserId && passkey.userId !== expectUserId) {
      throw new UnauthorizedException('Passkey belongs to another user');
    }
    const result = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: passkey.counter,
        transports: passkey.transports as AuthenticatorTransport[],
      },
    });
    if (!result.verified) throw new UnauthorizedException('Passkey verification failed');
    // The counter must only ever go up — a replayed old count means a cloned authenticator.
    await this.prisma.passkey.update({
      where: { id: passkey.id },
      data: { counter: result.authenticationInfo.newCounter, lastUsedAt: new Date() },
    });
    return passkey.userId;
  }

  list(userId: string) {
    return this.prisma.passkey.findMany({
      where: { userId },
      select: { id: true, label: true, deviceType: true, backedUp: true, createdAt: true, lastUsedAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const r = await this.prisma.passkey.deleteMany({ where: { id, userId } }); // own only
    if (r.count === 0) throw new NotFoundException('Passkey not found');
  }
}
