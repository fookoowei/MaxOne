import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { AuthUser } from '../auth/jwt.strategy';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { RatesService } from '../rates/rates.service';
import { convertMinor } from '../rates/convert-minor';
import { AuditService } from '../audit/audit.service';
import type { AuditAction } from '../audit/audit.actions';

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly rates: RatesService,
    private readonly audit: AuditService,
  ) {}

  createWallet(actor: AuthUser, dto: { name: string; currency: string }) {
    return this.prisma.wallet.create({
      data: { userId: actor.id, name: dto.name, currency: dto.currency },
    });
  }

  listWallets(actor: AuthUser) {
    return this.prisma.wallet.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Resolve a public @handle to a receivable wallet. Minimal return (never the email or
  // full row). A 404 reveals non-existence — inherent to pay-by-identifier; auth-gated.
  async findRecipientByHandle(handle: string) {
    const user = await this.users.findByHandle(handle.toLowerCase());
    if (!user) throw new NotFoundException('No account found with that handle');
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });
    if (!wallet) throw new NotFoundException('That account has no wallet');
    return {
      walletId: wallet.id,
      currency: wallet.currency,
      recipientName: `${user.firstName} ${user.lastName}`,
    };
  }

  getWallet(id: string, actor: AuthUser) {
    return this.getOwnedWallet(id, actor);
  }

  async listTransactions(id: string, actor: AuthUser) {
    await this.getOwnedWallet(id, actor); // 404 if missing, 403 if not owned
    return this.prisma.transaction.findMany({
      where: { walletId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestDeposit(id: string, actor: AuthUser, amount: number, note?: string) {
    await this.getOwnedWallet(id, actor);
    return this.prisma.transaction.create({
      data: { walletId: id, type: 'deposit', amount, status: 'pending', requestedBy: actor.id, note },
    });
  }

  async requestWithdrawal(id: string, actor: AuthUser, amount: number, note?: string) {
    const wallet = await this.getOwnedWallet(id, actor);
    // Friendly, NON-authoritative pre-check: fail obvious cases early so a customer
    // isn't left with a doomed pending request. The authoritative check is at approval
    // (the balance can change between request and approval).
    if (wallet.balance < amount) throw new BadRequestException('Insufficient funds');
    return this.prisma.transaction.create({
      data: { walletId: id, type: 'withdrawal', amount, status: 'pending', requestedBy: actor.id, note },
    });
  }

  listPending() {
    // Enrich each row so the approvals UI is self-describing (no per-row lookups):
    // the wallet's name + currency (currency is needed to format the amount) and the
    // wallet owner's email. `requestedBy` stays a bare string — it has no FK to join.
    return this.prisma.transaction.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      include: {
        wallet: {
          select: {
            id: true,
            name: true,
            currency: true,
            user: { select: { email: true } },
          },
        },
      },
    });
  }

  // Staff (back-office) reads: ownership-free — authorization is the AdminWalletsController's
  // job (transaction.view_all). Kept separate from the customer methods above so each has one
  // audience and one authz rule. `satisfies` (not `as const`) validates the shape against
  // Prisma's select type while keeping the literal so Prisma still infers the returned fields.
  private static readonly STAFF_WALLET_SELECT = {
    id: true,
    name: true,
    currency: true,
    balance: true,
    createdAt: true,
    user: { select: { email: true } },
  } satisfies Prisma.WalletSelect;

  async listAllWallets({ skip = 0, take = 20 }: { skip?: number; take?: number }) {
    const [wallets, total] = await Promise.all([
      this.prisma.wallet.findMany({
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        select: WalletsService.STAFF_WALLET_SELECT,
      }),
      this.prisma.wallet.count(),
    ]);
    return { total, skip, take, wallets };
  }

  async getWalletForStaff(id: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id },
      select: WalletsService.STAFF_WALLET_SELECT,
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async listTransactionsForStaff(id: string) {
    await this.getWalletForStaff(id); // 404 if the wallet doesn't exist
    return this.prisma.transaction.findMany({
      where: { walletId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(txnId: string, actor: AuthUser) {
    // Permission check runs BEFORE the transaction opens: it needs only `type`, which is
    // immutable, and it does unrelated I/O (a user+permissions read). Doing it under the
    // row lock would hold that lock across an extra round-trip and borrow a second pool
    // connection while holding the first — a pool-starvation deadlock under load.
    await this.assertApprovePermission(actor, await this.getSettleableType(txnId));

    return this.prisma.$transaction(async (tx) => {
      // Lock the transaction row first (fixed order: txn, then wallet).
      await tx.$queryRaw`SELECT id FROM "Transaction" WHERE id = ${txnId} FOR UPDATE`;
      const txn = await tx.transaction.findUnique({ where: { id: txnId } });
      if (!txn) throw new NotFoundException('Transaction not found');
      // Re-checked under the lock: unlike `type`, status CAN change between the two reads.
      if (txn.status !== 'pending') throw new ConflictException('Transaction already reviewed');

      // Lock the wallet row, then read its true current balance.
      await tx.$queryRaw`SELECT id FROM "Wallet" WHERE id = ${txn.walletId} FOR UPDATE`;
      const wallet = await tx.wallet.findUnique({ where: { id: txn.walletId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const before = wallet.balance;
      let after: number;
      if (txn.type === 'withdrawal') {
        if (before < txn.amount) throw new BadRequestException('Insufficient funds');
        after = before - txn.amount;
      } else {
        after = before + txn.amount; // deposit
      }

      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: after } });
      const updated = await tx.transaction.update({
        where: { id: txn.id },
        data: {
          status: 'approved',
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          balanceBefore: before,
          balanceAfter: after,
        },
      });

      // Same tx: the settlement and its audit entry commit together or not at all.
      // Explicit ternary rather than a template string, so the value is typed, not cast.
      const action: AuditAction =
        txn.type === 'withdrawal' ? 'withdrawal.approve' : 'deposit.approve';
      await this.audit.log(tx, {
        actorUserId: actor.id,
        action,
        entityType: 'transaction',
        entityId: txn.id,
        oldValue: { status: 'pending' },
        newValue: { status: 'approved', balanceAfter: after },
      });

      return updated;
    });
  }

  async reject(txnId: string, actor: AuthUser, note?: string) {
    await this.assertApprovePermission(actor, await this.getSettleableType(txnId));

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Transaction" WHERE id = ${txnId} FOR UPDATE`;
      const txn = await tx.transaction.findUnique({ where: { id: txnId } });
      if (!txn) throw new NotFoundException('Transaction not found');
      if (txn.status !== 'pending') throw new ConflictException('Transaction already reviewed');

      const note_ = note ?? txn.note;
      const updated = await tx.transaction.update({
        where: { id: txn.id },
        data: {
          status: 'rejected',
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          note: note_,
        },
      });

      const action: AuditAction =
        txn.type === 'withdrawal' ? 'withdrawal.reject' : 'deposit.reject';
      await this.audit.log(tx, {
        actorUserId: actor.id,
        action,
        entityType: 'transaction',
        entityId: txn.id,
        oldValue: { status: 'pending' },
        newValue: { status: 'rejected', note: note_ },
      });

      return updated;
    });
  }

  /**
   * Finance-only direct correction/bonus. No pending stage: locks the wallet, applies a
   * credit or debit, and writes an already-settled adjustment row — all atomically.
   * Route-gated by wallet.adjust (permission), so no per-type check here.
   */
  async adjust(
    walletId: string,
    dto: { direction: 'credit' | 'debit'; amount: number; note: string },
    actor: AuthUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Wallet" WHERE id = ${walletId} FOR UPDATE`;
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const before = wallet.balance;
      const after = dto.direction === 'credit' ? before + dto.amount : before - dto.amount;
      if (after < 0) throw new BadRequestException('Adjustment would make the balance negative');

      await tx.wallet.update({ where: { id: walletId }, data: { balance: after } });
      const created = await tx.transaction.create({
        data: {
          walletId,
          type: 'adjustment',
          amount: dto.amount,
          balanceBefore: before,
          balanceAfter: after,
          status: 'approved',
          requestedBy: actor.id,
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          note: dto.note,
        },
      });

      // The control weakness accepted in M4a (requestedBy === reviewedBy) is mitigated here:
      // narrow permission + mandatory note + this audit entry.
      await this.audit.log(tx, {
        actorUserId: actor.id,
        action: 'wallet.adjust',
        entityType: 'wallet',
        entityId: walletId,
        oldValue: { balance: before },
        newValue: { balance: after, direction: dto.direction, amount: dto.amount, note: dto.note },
      });

      return created;
    });
  }

  /**
   * Instant wallet-to-wallet transfer. Same currency: moves `amount` unchanged (M4b). Different
   * currencies: fetches a live rate BEFORE the transaction opens (never hold locks across an external
   * call), converts with banker's rounding, and records the rate on both linked ledger rows.
   */
  async transfer(
    fromWalletId: string,
    actor: AuthUser,
    dto: { toWalletId: string; amount: number; note?: string },
  ) {
    // Checked before the transaction: locking one row twice is meaningless, and the
    // arithmetic below would double-count a single wallet.
    if (dto.toWalletId === fromWalletId) {
      throw new BadRequestException('Cannot transfer to the same wallet');
    }

    // Ownership of the SOURCE only, before the transaction opens. Returns the wallet (immutable
    // currency is all we need from it here; the mutable balance is re-read under the lock).
    const source = await this.getOwnedWallet(fromWalletId, actor);

    // Destination existence + currency, read before the lock. `currency` is immutable per wallet,
    // so reading it early is safe (same reasoning as M4a's `type`).
    const dest = await this.prisma.wallet.findUnique({ where: { id: dto.toWalletId } });
    if (!dest) throw new NotFoundException('Destination wallet not found');

    // Fetch the rate BEFORE the lock — an external HTTP call must never run while holding two wallet
    // locks. With `amount` (caller-supplied) and the rate both known, the entire conversion is
    // determined here, before anything is locked. Same currency => no rate call, credit == amount.
    let exchangeRate: Prisma.Decimal | null = null;
    let credit = dto.amount;
    if (source.currency !== dest.currency) {
      exchangeRate = await this.rates.getRate(source.currency, dest.currency); // 503 on failure
      credit = convertMinor(dto.amount, exchangeRate); // banker's rounding, shared with /rates/quote
    }

    const transferId = randomUUID();
    // Deterministic lock order. NOT sender-then-receiver: if it were, Alice->Bob and
    // Bob->Alice running concurrently would each hold the row the other needs, and
    // Postgres would kill one for deadlock. Sorted, both lock the same wallet first.
    const [firstLock, secondLock] = [fromWalletId, dto.toWalletId].sort();

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Wallet" WHERE id = ${firstLock} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Wallet" WHERE id = ${secondLock} FOR UPDATE`;

      // Re-read under the locks: only the balances are mutable and must be trusted here.
      const from = await tx.wallet.findUnique({ where: { id: fromWalletId } });
      if (!from) throw new NotFoundException('Wallet not found');
      const to = await tx.wallet.findUnique({ where: { id: dto.toWalletId } });
      if (!to) throw new NotFoundException('Destination wallet not found');

      if (from.balance < dto.amount) throw new BadRequestException('Insufficient funds');

      const fromAfter = from.balance - dto.amount;
      const toAfter = to.balance + credit;
      const settledAt = new Date();

      await tx.wallet.update({ where: { id: from.id }, data: { balance: fromAfter } });
      await tx.wallet.update({ where: { id: to.id }, data: { balance: toAfter } });

      // Shared across both halves. `amount` is NOT shared — each row records its OWN currency's
      // amount (the debit on the sender, the converted credit on the receiver). `exchangeRate` is
      // the same on both (null for a same-currency transfer).
      const shared = {
        transferId,
        status: 'approved',
        requestedBy: actor.id,
        reviewedBy: actor.id,
        reviewedAt: settledAt,
        note: dto.note,
        exchangeRate,
      };

      const outRow = await tx.transaction.create({
        data: {
          ...shared,
          walletId: from.id,
          type: 'transfer_out',
          amount: dto.amount,
          counterpartyWalletId: to.id,
          balanceBefore: from.balance,
          balanceAfter: fromAfter,
        },
      });

      await tx.transaction.create({
        data: {
          ...shared,
          walletId: to.id,
          type: 'transfer_in',
          amount: credit,
          counterpartyWalletId: from.id,
          balanceBefore: to.balance,
          balanceAfter: toAfter,
        },
      });

      // Anchored to the SOURCE wallet: one action by one actor is one audit row. The
      // destination appears in newValue, and the ledger already links both halves by transferId.
      await this.audit.log(tx, {
        actorUserId: actor.id,
        action: 'wallet.transfer',
        entityType: 'wallet',
        entityId: from.id,
        oldValue: { balance: from.balance },
        newValue: {
          balance: fromAfter,
          toWalletId: to.id,
          amount: dto.amount,
          credit,
          // JSON has no decimal type; stringify so the rate survives round-tripping exactly.
          exchangeRate: exchangeRate ? exchangeRate.toString() : null,
        },
      });

      // Only the sender's row is returned: the receiver's row carries their balance,
      // which the sender has no right to see.
      return outRow;
    });
  }

  /**
   * The transaction's `type`, read outside any lock. Safe to read early because `type` is
   * written once at request time and never changes; everything mutable is re-read under the
   * lock. Returns 404 here so a bad id fails before we bother taking locks.
   */
  private async getSettleableType(txnId: string) {
    const txn = await this.prisma.transaction.findUnique({
      where: { id: txnId },
      select: { type: true },
    });
    if (!txn) throw new NotFoundException('Transaction not found');
    return txn.type;
  }

  /**
   * Approving a deposit needs deposit.approve; a withdrawal needs withdrawal.approve.
   * Which one is required depends on the row's type, so the check is here, not in a
   * static route guard. Permissions are read from the DB (never the token) — M3's rule.
   */
  private async assertApprovePermission(actor: AuthUser, type: string) {
    const code = type === 'withdrawal' ? 'withdrawal.approve' : 'deposit.approve';
    const user = await this.users.findByIdWithPermissions(actor.id);
    const held = new Set(user?.role.permissions.map((permission) => permission.code) ?? []);
    if (!held.has(code)) throw new ForbiddenException('Access denied');
  }

  /**
   * Ownership-gating: load a wallet and confirm the caller owns it.
   * The check lives here (not a guard) because it depends on the loaded row.
   */
  private async getOwnedWallet(id: string, actor: AuthUser) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.userId !== actor.id) throw new ForbiddenException('Access denied');
    return wallet;
  }
}
