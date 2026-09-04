import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from './roles.service';
import { toSafeUser } from './to-safe-user';
import type { AuthUser } from '../auth/jwt.strategy';
import { AuditService } from '../audit/audit.service';

export interface CreateUserData {
  email: string;
  handle: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  roleId: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roles: RolesService,
    private readonly audit: AuditService,
  ) {}

  create(data: CreateUserData) {
    return this.prisma.user.create({ data });
  }

  // Onboarding: a new customer must land on a dashboard with a real wallet, so the
  // user and their default USD wallet are created atomically — a failure to create
  // the wallet rolls back the user too. Returns the user with its role for token issuance.
  createWithDefaultWallet(data: CreateUserData) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data, include: { role: true } });
      await tx.wallet.create({
        data: { userId: user.id, name: 'My Wallet', currency: 'USD' },
      });
      return user;
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByHandle(handle: string) {
    return this.prisma.user.findUnique({ where: { handle } });
  }

  findByEmailWithRole(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  /**
   * The guard's lookup: the whole authorisation picture in one query.
   * Returns the RAW row (hash included) — only PermissionsGuard consumes it and its
   * result never reaches a response, so it is deliberately not passed through toSafeUser.
   */
  findByIdWithPermissions(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: { include: { permissions: true } } },
    });
  }

  /** One page of users, plus the total so a UI can render "showing 10–20 of 37". */
  async findMany({ skip = 0, take = 20 }: { skip?: number; take?: number }) {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { role: { select: { id: true, name: true } } },
      }),
      this.prisma.user.count(),
    ]);
    return { total, skip, take, users: users.map(toSafeUser) };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: { select: { id: true, name: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return toSafeUser(user);
  }

  async updateStatus(id: string, status: 'active' | 'suspended', actor: AuthUser) {
    // Self-lockout guard: suspending yourself is never intentional.
    if (id === actor.id) throw new ForbiddenException('You cannot change your own status');

    // 404 if the target doesn't exist — and the result is the "before" state for the audit
    // entry, which this method previously threw away.
    const before = await this.findById(id);

    // Transaction so the change and its audit entry land together or not at all.
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { status },
        include: { role: { select: { id: true, name: true } } },
      });

      // Immediate session kill: a suspended user's refresh tokens are revoked atomically
      // with the status change (they can't renew; the JWT strategy blocks live access).
      if (status === 'suspended') {
        await tx.refreshToken.deleteMany({ where: { userId: id } });
      }

      await this.audit.log(tx, {
        actorUserId: actor.id,
        action: 'user.status_change',
        entityType: 'user',
        entityId: id,
        oldValue: { status: before.status },
        newValue: { status },
      });

      return toSafeUser(user);
    });
  }

  async updateRole(id: string, roleName: string, actor: AuthUser) {
    // Self-escalation guard. `user.manage` belongs to `admin`; without this rule an
    // admin could promote themselves to super_admin and inherit every permission in
    // the system — including withdrawal.approve, deliberately withheld from them.
    if (id === actor.id) throw new ForbiddenException('You cannot change your own role');

    // ...and blocking self-promotion is pointless if an admin can crown an accomplice.
    if (roleName === 'super_admin' && actor.role !== 'super_admin') {
      throw new ForbiddenException('Only a super_admin may assign the super_admin role');
    }

    const role = await this.roles.findByName(roleName);
    if (!role) throw new NotFoundException(`Unknown role: ${roleName}`);

    const before = await this.findById(id); // 404 if the target doesn't exist

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { roleId: role.id },
        include: { role: { select: { id: true, name: true } } },
      });

      // Delegation (an admin granting `finance`) is allowed by design — this entry is the
      // control that makes it accountable. Names, not ids, so the log reads without a join.
      await this.audit.log(tx, {
        actorUserId: actor.id,
        action: 'user.role_change',
        entityType: 'user',
        entityId: id,
        oldValue: { role: before.role.name },
        newValue: { role: role.name },
      });

      return toSafeUser(user);
    });
  }

  // ── 2FA persistence. findByIdRaw is NOT safe-stripped (carries the TOTP secret + recovery
  // hashes) — internal use only; never return it from a route. ──
  findByIdRaw(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: { role: true } });
  }

  setTotpPending(id: string, secret: string) {
    return this.prisma.user.update({
      where: { id },
      data: { totpSecret: secret, totpEnabled: false, totpRecoveryHashes: [] },
    });
  }

  enableTotp(id: string, recoveryHashes: string[]) {
    return this.prisma.user.update({
      where: { id },
      data: { totpEnabled: true, totpRecoveryHashes: recoveryHashes },
    });
  }

  disableTotp(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { totpSecret: null, totpEnabled: false, totpRecoveryHashes: [] },
    });
  }

  // One-time: remove the used recovery-code hash.
  async consumeRecoveryHash(id: string, hash: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { totpRecoveryHashes: true },
    });
    const remaining = (user?.totpRecoveryHashes ?? []).filter((h) => h !== hash);
    return this.prisma.user.update({ where: { id }, data: { totpRecoveryHashes: remaining } });
  }
}
