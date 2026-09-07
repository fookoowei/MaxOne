import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Gauge, Registry, collectDefaultMetrics } from 'prom-client';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { CacheService } from '../cache/cache.service';
import { QUEUES } from '../queue/events';
import { captureMessage } from './sentry';

export const REFRESH_EVERY_MS = 30_000;
export const OUTBOX_PENDING_AGE_LIMIT_S = 60;

export interface OpsSnapshot {
  redisUp: boolean;
  rabbitmqUp: boolean;
  outboxPending: number;
  outboxOldestPendingSec: number;
  deadLetters: number;
}

/**
 * M17: the two numbers M16 produced that say "something is silently broken", exposed as Prometheus
 * gauges and watched every 30s. A threshold breach is reported ONCE (on the transition), not on
 * every tick, and recovery is logged — the same way a pager works. API only.
 *  - dead letters > 0            → a push permanently failed and is waiting for a human
 *  - oldest pending outbox > 60s → events aren't reaching the broker (broker down / relay stuck)
 */
@Injectable()
export class OpsWatchService {
  private readonly log = new Logger(OpsWatchService.name);
  readonly registry = new Registry();
  private readonly gauges = {
    outboxPending: new Gauge({ name: 'maxone_outbox_pending', help: 'Outbox rows not yet published', registers: [this.registry] }),
    outboxOldest: new Gauge({ name: 'maxone_outbox_oldest_pending_seconds', help: 'Age of the oldest pending outbox row', registers: [this.registry] }),
    deadLetters: new Gauge({ name: 'maxone_dead_letters', help: 'Messages in notifications.push.dead', registers: [this.registry] }),
    redisUp: new Gauge({ name: 'maxone_redis_up', help: '1 if Redis answers PING', registers: [this.registry] }),
    rabbitmqUp: new Gauge({ name: 'maxone_rabbitmq_up', help: '1 if the broker connection is open', registers: [this.registry] }),
  };
  private readonly breached = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly cache: CacheService,
  ) {
    collectDefaultMetrics({ register: this.registry, prefix: 'maxone_node_' });
  }

  async snapshot(): Promise<OpsSnapshot> {
    const [redisUp, deadLetters, pendingCount, oldest] = await Promise.all([
      this.cache.ping(),
      this.queue.depth(QUEUES.notificationsPushDead),
      this.prisma.outboxEvent.count({ where: { status: 'pending' } }),
      this.prisma.outboxEvent.findFirst({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    ]);
    return {
      redisUp,
      rabbitmqUp: this.queue.isConnected(),
      outboxPending: pendingCount,
      outboxOldestPendingSec: oldest ? Math.floor((Date.now() - oldest.createdAt.getTime()) / 1000) : 0,
      deadLetters: deadLetters ?? 0,
    };
  }

  @Interval(REFRESH_EVERY_MS)
  async refresh(): Promise<OpsSnapshot | null> {
    let snap: OpsSnapshot;
    try {
      snap = await this.snapshot();
    } catch (e) {
      this.log.warn(`ops snapshot failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
    this.gauges.outboxPending.set(snap.outboxPending);
    this.gauges.outboxOldest.set(snap.outboxOldestPendingSec);
    this.gauges.deadLetters.set(snap.deadLetters);
    this.gauges.redisUp.set(snap.redisUp ? 1 : 0);
    this.gauges.rabbitmqUp.set(snap.rabbitmqUp ? 1 : 0);

    this.watch('dead-letters', snap.deadLetters > 0, `${snap.deadLetters} message(s) in ${QUEUES.notificationsPushDead} need a human`);
    this.watch(
      'outbox-stuck',
      snap.outboxOldestPendingSec > OUTBOX_PENDING_AGE_LIMIT_S,
      `oldest pending outbox event is ${snap.outboxOldestPendingSec}s old (${snap.outboxPending} pending) — events are not reaching the broker`,
    );
    return snap;
  }

  // Alert on the transition INTO breach, log once on recovery. Never once per tick.
  private watch(key: string, isBreached: boolean, message: string): void {
    const was = this.breached.has(key);
    if (isBreached && !was) {
      this.breached.add(key);
      this.log.error(`ALERT ${key}: ${message}`);
      captureMessage(`ALERT ${key}: ${message}`, 'error', { key });
    } else if (!isBreached && was) {
      this.breached.delete(key);
      this.log.log(`RECOVERED ${key}`);
    }
  }
}
