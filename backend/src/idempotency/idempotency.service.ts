import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const TTL_MS = 24 * 60 * 60 * 1000;

export type Reservation =
  | { kind: 'new'; id: string }
  | { kind: 'replay'; statusCode: number; body: unknown }
  | { kind: 'mismatch' }
  | { kind: 'in_progress' };

// The idempotency store. Reserve → run → complete (or release on failure).
@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  // Claim the key BEFORE the handler runs. The unique (userId, key) INSERT is the concurrency
  // guarantee: a simultaneous duplicate hits P2002 and is routed to replay / in-progress —
  // it can never run the handler a second time. (Same "reserve atomically" lesson as M14a.)
  async reserve(userId: string, key: string, fingerprint: string): Promise<Reservation> {
    try {
      const row = await this.prisma.idempotencyKey.create({ data: { userId, key, fingerprint } });
      return { kind: 'new', id: row.id };
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') throw err;
    }
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { userId_key: { userId, key } },
    });
    if (!existing) return this.reserve(userId, key, fingerprint); // vanished in between — retry once
    if (existing.createdAt.getTime() < Date.now() - TTL_MS) {
      await this.prisma.idempotencyKey.delete({ where: { id: existing.id } }); // expired → fresh start
      return this.reserve(userId, key, fingerprint);
    }
    if (existing.fingerprint !== fingerprint) return { kind: 'mismatch' };
    if (existing.status !== 'completed') return { kind: 'in_progress' };
    return { kind: 'replay', statusCode: existing.statusCode ?? 200, body: existing.responseBody };
  }

  complete(id: string, statusCode: number, body: unknown) {
    return this.prisma.idempotencyKey.update({
      where: { id },
      data: {
        status: 'completed',
        statusCode,
        responseBody: body === undefined ? Prisma.JsonNull : (body as Prisma.InputJsonValue),
      },
    });
  }

  // A failed handler moved nothing — free the key so a retry can actually run.
  async release(id: string): Promise<void> {
    await this.prisma.idempotencyKey.deleteMany({ where: { id } });
  }
}
