import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { TokensService } from '../../src/auth/tokens.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { bootApp, resetDb } from './db';

describe('TokensService.rotate against a real Postgres', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokens: TokensService;

  beforeAll(async () => {
    ({ app, prisma } = await bootApp());
    tokens = app.get(TokensService);
  });
  beforeEach(() => resetDb(prisma));
  afterAll(() => app.close());

  async function userWithSession() {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'user' } });
    const user = await prisma.user.create({
      data: { email: 'rot@test.local', handle: 'rot', passwordHash: 'x', firstName: 'R', lastName: 'T', roleId: role.id },
      include: { role: true },
    });
    const { refreshToken } = await tokens.issueTokens(user);
    return { user, refreshToken };
  }

  it('two SIMULTANEOUS rotations of one token → exactly one wins, and the family is fully revoked', async () => {
    const { user, refreshToken } = await userWithSession();
    const [a, b] = await Promise.allSettled([tokens.rotate(refreshToken), tokens.rotate(refreshToken)]);
    const fulfilled = [a, b].filter((r) => r.status === 'fulfilled');
    const rejected = [a, b].filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1); // the atomic claim: only one can mark it used
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(UnauthorizedException);
    // The loser's revoke ran after the winner's claim+new-token committed → NO live token remains.
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
  });

  it('replaying a spent token revokes the whole family, including the newer token', async () => {
    const { user, refreshToken: r1 } = await userWithSession();
    const { refreshToken: r2 } = await tokens.rotate(r1); // r1 is now spent, r2 is live
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(2);

    await expect(tokens.rotate(r1)).rejects.toBeInstanceOf(UnauthorizedException); // replay
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
    await expect(tokens.rotate(r2)).rejects.toBeInstanceOf(UnauthorizedException); // r2 died with the family
  });
});
