import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { QueueService } from '../queue/queue.service';
import { QUEUES } from '../queue/events';

export interface HealthReport {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  redis: 'up' | 'down';
  rabbitmq: 'up' | 'down';
  outboxPending: number | null;
  deadLetters: number | null;
}

/**
 * M17: a truthful health check. Postgres down = the app cannot do its job → the controller answers
 * 503 (Render's health check fails, the instance is replaced). Redis/RabbitMQ down = degraded but
 * serving (both are fail-soft by design) → 200 with the truth in the body.
 */
@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly queue: QueueService,
  ) {}

  async check(): Promise<HealthReport> {
    const [db, redis, deadLetters, outboxPending] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(() => 'up' as const, () => 'down' as const),
      this.cache.ping().then((ok) => (ok ? ('up' as const) : ('down' as const))),
      this.queue.depth(QUEUES.notificationsPushDead),
      this.prisma.outboxEvent.count({ where: { status: 'pending' } }).catch(() => null),
    ]);
    const rabbitmq = this.queue.isConnected() ? 'up' : 'down';
    const status = db === 'up' && redis === 'up' && rabbitmq === 'up' ? 'ok' : 'degraded';
    return { status, db, redis, rabbitmq, outboxPending, deadLetters };
  }
}
