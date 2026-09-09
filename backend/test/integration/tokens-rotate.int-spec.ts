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
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: 'user' },
    });
    const user = await prisma.user.create({
      data: {
        email: 'rot@test.local',
        handle: 'rot',
        passwordHash: 'x',
        firstName: 'R',
        lastName: 'T',
        roleId: role.id,
      },
      include: { role: true },
    });
    const { refreshToken } = await tokens.issueTokens(user);
    return { user, refreshToken };
  }

  it('two SIMULTANEOUS rotations of one token → BOTH get a live pair in the same family (serverless BFF races)', async () => {
    const { user, refreshToken } = await userWithSession();
    const [a, b] = await Promise.all([
      tokens.rotate(refreshToken),
      tokens.rotate(refreshToken),
    ]);
    expect(a.refreshToken).not.toBe(b.refreshToken);
    // spent original + two live siblings; nothing revoked
    expect(
      await prisma.refreshToken.count({ where: { userId: user.id } }),
    ).toBe(3);
    expect(
      await prisma.refreshToken.count({
        where: { userId: user.id, usedAt: null },
      }),
    ).toBe(2);
    // …and each sibling rotates normally afterwards (a real session continues on either).
    await expect(tokens.rotate(a.refreshToken)).resolves.toBeDefined();
  });

  it('replaying a spent token AFTER the grace window revokes the whole family, including the newer token', async () => {
    const { user, refreshToken: r1 } = await userWithSession();
    const { refreshToken: r2 } = await tokens.rotate(r1); // r1 is now spent, r2 is live
    expect(
      await prisma.refreshToken.count({ where: { userId: user.id } }),
    ).toBe(2);
    // Age the spent row past the 30s concurrent-refresh grace so this counts as a replay.
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, usedAt: { not: null } },
      data: { usedAt: new Date(Date.now() - 60_000) },
    });

    await expect(tokens.rotate(r1)).rejects.toBeInstanceOf(
      UnauthorizedException,
    ); // replay
    expect(
      await prisma.refreshToken.count({ where: { userId: user.id } }),
    ).toBe(0);
    await expect(tokens.rotate(r2)).rejects.toBeInstanceOf(
      UnauthorizedException,
    ); // r2 died with the family
  });
});
