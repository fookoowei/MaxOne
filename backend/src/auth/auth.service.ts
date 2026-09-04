import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RolesService } from '../users/roles.service';
import { TokensService } from './tokens.service';
import { TwoFactorService } from './two-factor.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// Precomputed once at startup. When an email doesn't exist we still run one
// bcrypt.compare against this dummy hash, so login takes ~constant time and
// can't be used as a timing oracle to discover which emails have accounts.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('a-non-matching-dummy-password', 10);

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly roles: RolesService,
    private readonly tokens: TokensService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  // The non-sensitive user shape every auth response returns.
  private toPublic(user: {
    id: string; email: string; role: { name: string };
    firstName: string; lastName: string; handle: string | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role.name,
      firstName: user.firstName,
      lastName: user.lastName,
      handle: user.handle,
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const handle = dto.handle.toLowerCase();
    if (await this.users.findByHandle(handle)) {
      throw new ConflictException('Handle already taken');
    }

    const role = await this.roles.findByNameOrThrow('user');
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create the user + their default wallet atomically, then log them straight in
    // by issuing tokens — sign-up returns the same { user, tokens } shape as login.
    const user = await this.users.createWithDefaultWallet({
      email: dto.email,
      handle,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      roleId: role.id,
    });

    const tokens = await this.tokens.issueTokens(user);
    return {
      user: this.toPublic(user),
      tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithRole(dto.email);

    // Same vague failure for "no such email" AND "wrong password" — this denies
    // an attacker any signal about which emails have accounts (user enumeration).
    // Always run one bcrypt.compare (dummy hash if no user) to keep timing constant.
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !passwordMatches) throw new UnauthorizedException('Invalid credentials');

    // 2FA on → do NOT issue tokens yet. Hand back a short-lived challenge that proves
    // "password verified"; the real tokens come from login2fa once a code is presented.
    if (user.totpEnabled) {
      return { requires2fa: true as const, challengeToken: await this.tokens.issue2faChallenge(user.id) };
    }

    const tokens = await this.tokens.issueTokens(user);
    return {
      user: this.toPublic(user),
      tokens,
    };
  }

  // Second login step: challenge (from login) + a TOTP or recovery code → the real tokens.
  async login2fa(challengeToken: string, code: string) {
    const userId = await this.tokens.verify2faChallenge(challengeToken);
    const user = await this.users.findByIdRaw(userId);
    if (!user || !(await this.twoFactor.verifyForLogin(userId, code))) {
      throw new UnauthorizedException('Invalid code');
    }
    const tokens = await this.tokens.issueTokens(user);
    return { user: this.toPublic(user), tokens };
  }

  // Passkey sign-in: possession + biometric/PIN is a stronger factor than TOTP, so no 2-step.
  async loginWithPasskey(userId: string) {
    const user = await this.users.findByIdRaw(userId);
    if (!user || user.status !== 'active') throw new UnauthorizedException('Invalid credentials');
    const tokens = await this.tokens.issueTokens(user);
    return { user: this.toPublic(user), tokens };
  }
}
