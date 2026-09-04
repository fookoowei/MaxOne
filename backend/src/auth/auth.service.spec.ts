import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RolesService } from '../users/roles.service';
import { TokensService } from './tokens.service';
import { TwoFactorService } from './two-factor.service';
import { RegisterDto } from './dto/register.dto';

const dto: RegisterDto = {
  email: 'alice@example.com',
  handle: 'alice',
  password: 'Password123',
  firstName: 'Alice',
  lastName: 'Lee',
};

// Build a fresh AuthService wired to mocked collaborators for each test.
// AuthService no longer knows Prisma exists — it talks to UsersService/RolesService.
function buildService(
  usersMock: any,
  tokensMock: any = { issueTokens: jest.fn() },
  rolesMock: any = {
    findByNameOrThrow: jest.fn().mockResolvedValue({ id: 'role-user', name: 'user' }),
  },
  twoFactorMock: any = { verifyForLogin: jest.fn() },
) {
  return Test.createTestingModule({
    providers: [
      AuthService,
      { provide: UsersService, useValue: usersMock },
      { provide: RolesService, useValue: rolesMock },
      { provide: TokensService, useValue: tokensMock },
      { provide: TwoFactorService, useValue: twoFactorMock },
    ],
  })
    .compile()
    .then((moduleRef) => moduleRef.get(AuthService));
}

describe('AuthService.register', () => {
  it('creates a user with a default wallet, issues tokens, and returns { user, tokens }', async () => {
    const createdUser = {
      id: 'user-1',
      email: dto.email,
      firstName: 'Alice',
      lastName: 'Lee',
      handle: 'alice',
      role: { name: 'user' },
    };
    const usersMock = {
      findByEmail: jest.fn().mockResolvedValue(null), // email not taken
      findByHandle: jest.fn().mockResolvedValue(null), // handle not taken
      createWithDefaultWallet: jest.fn().mockResolvedValue(createdUser),
    };
    const tokensMock = {
      issueTokens: jest.fn().mockResolvedValue({ accessToken: 'a.jwt', refreshToken: 'r-opaque' }),
    };
    const service = await buildService(usersMock, tokensMock);

    const result = await service.register(dto);

    expect(result).toEqual({
      user: {
        id: 'user-1',
        email: dto.email,
        role: 'user',
        firstName: 'Alice',
        lastName: 'Lee',
        handle: 'alice',
      },
      tokens: { accessToken: 'a.jwt', refreshToken: 'r-opaque' },
    });
    // Stored a hash, not the plaintext; assigned the default 'user' role; persisted the handle.
    const passedData = usersMock.createWithDefaultWallet.mock.calls[0][0];
    expect(passedData.passwordHash).toBeDefined();
    expect(passedData.passwordHash).not.toBe(dto.password);
    expect(passedData.roleId).toBe('role-user');
    expect(passedData.handle).toBe('alice');
    // Tokens issued for the created user (right identity/role).
    expect(tokensMock.issueTokens).toHaveBeenCalledWith(createdUser);
  });

  it('throws ConflictException when the email is already registered', async () => {
    const usersMock = {
      findByEmail: jest.fn().mockResolvedValue({ id: 'existing', email: dto.email }),
      findByHandle: jest.fn(),
      createWithDefaultWallet: jest.fn(),
    };
    const service = await buildService(usersMock);

    await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(usersMock.createWithDefaultWallet).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the handle is already taken', async () => {
    const usersMock = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findByHandle: jest.fn().mockResolvedValue({ id: 'other', handle: 'alice' }),
      createWithDefaultWallet: jest.fn(),
    };
    const service = await buildService(usersMock);

    await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(usersMock.createWithDefaultWallet).not.toHaveBeenCalled();
  });
});

describe('AuthService.login', () => {
  const credentials = { email: 'alice@example.com', password: 'Password123' };

  it('issues tokens when the email exists and the password matches', async () => {
    // Store a REAL bcrypt hash so the service's bcrypt.compare actually succeeds.
    const passwordHash = await bcrypt.hash(credentials.password, 10);
    const foundUser = {
      id: 'user-1',
      email: credentials.email,
      passwordHash,
      firstName: 'Alice',
      lastName: 'Lee',
      handle: 'alice',
      role: { name: 'user' },
    };
    const usersMock = { findByEmailWithRole: jest.fn().mockResolvedValue(foundUser) };
    const tokensMock = {
      issueTokens: jest.fn().mockResolvedValue({ accessToken: 'a.jwt', refreshToken: 'r-opaque' }),
    };
    const service = await buildService(usersMock, tokensMock);

    const result = await service.login(credentials);

    // Returns the safe user AND the token pair.
    expect(result).toEqual({
      user: {
        id: 'user-1',
        email: credentials.email,
        role: 'user',
        firstName: 'Alice',
        lastName: 'Lee',
        handle: 'alice',
      },
      tokens: { accessToken: 'a.jwt', refreshToken: 'r-opaque' },
    });
    // The factory was handed the found user (so tokens carry the right identity/role).
    expect(tokensMock.issueTokens).toHaveBeenCalledWith(foundUser);
  });

  it('throws UnauthorizedException when the password is wrong', async () => {
    const passwordHash = await bcrypt.hash('the-real-password', 10);
    const usersMock = {
      findByEmailWithRole: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: credentials.email,
        passwordHash,
        role: { name: 'user' },
      }),
    };
    const tokensMock = { issueTokens: jest.fn() };
    const service = await buildService(usersMock, tokensMock);

    await expect(service.login(credentials)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tokensMock.issueTokens).not.toHaveBeenCalled(); // never issue tokens on failure
  });

  it('throws UnauthorizedException when the email is unknown', async () => {
    const usersMock = { findByEmailWithRole: jest.fn().mockResolvedValue(null) };
    const tokensMock = { issueTokens: jest.fn() };
    const service = await buildService(usersMock, tokensMock);

    await expect(service.login(credentials)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tokensMock.issueTokens).not.toHaveBeenCalled();
  });
});

describe('AuthService.login with 2FA enabled', () => {
  it('returns a challenge and NO tokens when the user has TOTP enabled', async () => {
    const passwordHash = bcrypt.hashSync('Password123', 4);
    const usersMock = {
      findByEmailWithRole: jest.fn().mockResolvedValue({
        id: 'u1', email: 'a@b.c', passwordHash, totpEnabled: true,
        role: { name: 'user' }, firstName: 'A', lastName: 'B', handle: 'a',
      }),
    };
    const tokensMock = { issueTokens: jest.fn(), issue2faChallenge: jest.fn().mockResolvedValue('challenge.jwt') };
    const service = await buildService(usersMock, tokensMock);

    const res = await service.login({ email: 'a@b.c', password: 'Password123' });

    expect(res).toEqual({ requires2fa: true, challengeToken: 'challenge.jwt' });
    expect(tokensMock.issueTokens).not.toHaveBeenCalled();
  });
});

describe('AuthService.login2fa', () => {
  const raw = { id: 'u1', email: 'a@b.c', role: { name: 'user' }, firstName: 'A', lastName: 'B', handle: 'a', totpEnabled: true };

  it('issues tokens when the challenge + code are valid', async () => {
    const usersMock = { findByIdRaw: jest.fn().mockResolvedValue(raw) };
    const tokensMock = {
      verify2faChallenge: jest.fn().mockResolvedValue('u1'),
      issueTokens: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }),
    };
    const twoFactor = { verifyForLogin: jest.fn().mockResolvedValue(true) };
    const service = await buildService(usersMock, tokensMock, undefined, twoFactor);

    const res = await service.login2fa('challenge.jwt', '123456');

    expect(twoFactor.verifyForLogin).toHaveBeenCalledWith('u1', '123456');
    expect(res.tokens).toEqual({ accessToken: 'a', refreshToken: 'r' });
    expect(res.user).toEqual({ id: 'u1', email: 'a@b.c', role: 'user', firstName: 'A', lastName: 'B', handle: 'a' });
  });

  it('rejects a wrong code without issuing tokens', async () => {
    const usersMock = { findByIdRaw: jest.fn().mockResolvedValue(raw) };
    const tokensMock = { verify2faChallenge: jest.fn().mockResolvedValue('u1'), issueTokens: jest.fn() };
    const twoFactor = { verifyForLogin: jest.fn().mockResolvedValue(false) };
    const service = await buildService(usersMock, tokensMock, undefined, twoFactor);

    await expect(service.login2fa('challenge.jwt', '000000')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tokensMock.issueTokens).not.toHaveBeenCalled();
  });
});
