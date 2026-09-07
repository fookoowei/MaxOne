import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { PushService } from '../push/push.service';
import { parseNotificationPushEvent } from '../queue/events';
import type { AmqpMessage } from '../queue/amqp.types';

const PREFETCH = 10; // max unacked messages held by this worker: a slow push can't hoard the queue
const DRAIN_POLL_MS = 50;
const DRAIN_MAX_MS = 10_000;

/**
 * The first consumer: take a message → send the Web Push → ack. Anything we can't act on
 * (non-JSON, bad shape, push threw) is nacked WITHOUT requeue — discarded. Requeue=true on a
 * permanently bad message would spin forever; retries with backoff + a dead-letter queue are M16c.
 */
@Injectable()
export class NotificationConsumer {
  private readonly log = new Logger(NotificationConsumer.name);
  private inFlight = 0;

  constructor(
    private readonly queue: QueueService,
    private readonly push: PushService,
  ) {}

  async start(): Promise<void> {
    await this.queue.consume((msg) => this.handle(msg), PREFETCH);
    this.log.log(`Consuming notifications.push (prefetch ${PREFETCH})`);
  }

  /** Graceful stop: no new deliveries, then wait for in-flight handlers to ack/nack. */
  async stop(): Promise<void> {
    await this.queue.cancel();
    const deadline = Date.now() + DRAIN_MAX_MS;
    while (this.inFlight > 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, DRAIN_POLL_MS));
    }
  }

  async handle(msg: AmqpMessage): Promise<void> {
    this.inFlight += 1;
    try {
      const event = parseNotificationPushEvent(msg.content.toString());
      await this.push.sendToUser(event.userId, event.payload);
      this.queue.ack(msg);
      this.log.log(`push sent id=${event.id} user=${event.userId}`);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      this.log.warn(`discarding message (no requeue): ${reason}`);
      this.queue.nack(msg, false);
    } finally {
      this.inFlight -= 1;
    }
  }
}
