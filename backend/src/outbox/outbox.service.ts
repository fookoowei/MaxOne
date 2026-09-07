import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';

export interface OutboxRow {
  id: string;
  routingKey: string;
  payload: unknown;
}

const RELAY_EVERY_MS = 2_000;
const RELAY_BATCH = 50;
const PURGE_EVERY_MS = 3_600_000;
const KEEP_PUBLISHED_MS = 7 * 86_400_000;
const BROKER_DOWN = 'publish returned false (broker unavailable)';
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Transactional outbox. The event row is written INSIDE the caller's Postgres transaction, so it
 * exists iff the money moved. Two relay paths:
 *  - publishNow(): right after commit — the happy path, no added latency;
 *  - relayPending(): every 2s — the GUARANTEE. Finds rows that are still pending because the broker
 *    was down at commit time or the API died between commit and publish, and publishes them.
 * Message id = row id, so the consumer's M16c dedupe makes a double publish harmless.
 */
@Injectable()
export class OutboxService {
  private readonly log = new Logger(OutboxService.name);
  private relaying = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  /** Inside the caller's transaction: the ONLY way an event enters the system. */
  enqueue<T extends { id: string }>(tx: Prisma.TransactionClient, routingKey: string, event: T) {
    return tx.outboxEvent.create({
      data: { id: event.id, routingKey, payload: event as unknown as Prisma.InputJsonValue },
    });
  }

  /** Happy path, right after commit. Never throws; false = still pending, the poller will get it. */
  async publishNow(row: OutboxRow): Promise<boolean> {
    const ok = this.queue.publish(row.routingKey, row.payload, { messageId: row.id });
    try {
      if (ok) {
        await this.prisma.outboxEvent.update({
          where: { id: row.id },
          data: { status: 'published', publishedAt: new Date() },
        });
      } else {
        await this.prisma.outboxEvent.update({
          where: { id: row.id },
          data: { attempts: { increment: 1 }, lastError: BROKER_DOWN },
        });
      }
    } catch (e) {
      this.log.warn(`outbox mark failed id=${row.id}: ${msg(e)}`);
    }
    return ok;
  }

  /** The guarantee. SKIP LOCKED: several API instances split the batch instead of double-publishing. */
  @Interval(RELAY_EVERY_MS)
  async relayPending(): Promise<number> {
    if (this.relaying || !this.queue.isConnected()) return 0;
    this.relaying = true;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<OutboxRow[]>`
          SELECT id, "routingKey", payload FROM "OutboxEvent"
          WHERE status = 'pending' ORDER BY "createdAt" LIMIT ${RELAY_BATCH} FOR UPDATE SKIP LOCKED`;
        if (rows.length === 0) return 0;
        const done: string[] = [];
        const failed: string[] = [];
        for (const r of rows) {
          (this.queue.publish(r.routingKey, r.payload, { messageId: r.id }) ? done : failed).push(r.id);
        }
        if (done.length > 0) {
          await tx.outboxEvent.updateMany({
            where: { id: { in: done } },
            data: { status: 'published', publishedAt: new Date() },
          });
        }
        if (failed.length > 0) {
          await tx.outboxEvent.updateMany({
            where: { id: { in: failed } },
            data: { attempts: { increment: 1 }, lastError: BROKER_DOWN },
          });
        }
        this.log.log(
          `relayed ${done.length} pending outbox event(s)${failed.length ? `, ${failed.length} still pending` : ''}`,
        );
        return done.length;
      });
    } catch (e) {
      this.log.warn(`outbox relay failed: ${msg(e)}`);
      return 0;
    } finally {
      this.relaying = false;
    }
  }

  /** Published rows are only kept for debugging; drop them after 7 days. */
  @Interval(PURGE_EVERY_MS)
  async purgePublished(): Promise<number> {
    const cutoff = new Date(Date.now() - KEEP_PUBLISHED_MS);
    const { count } = await this.prisma.outboxEvent.deleteMany({
      where: { status: 'published', publishedAt: { lt: cutoff } },
    });
    if (count > 0) this.log.log(`purged ${count} published outbox event(s) older than 7d`);
    return count;
  }
}
