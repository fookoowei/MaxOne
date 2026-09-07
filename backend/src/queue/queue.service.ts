import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AMQP_CONNECT,
  type AmqpChannelLike,
  type AmqpConnect,
  type AmqpConnectionLike,
  type AmqpHeaders,
  type AmqpMessage,
} from './amqp.types';
import { EXCHANGES, QUEUES, RETRY_DELAYS_MS, ROUTING_KEYS } from './events';

const RECONNECT_CAP_MS = 10_000;

/**
 * One connection + one channel to RabbitMQ, topology asserted on every (re)connect.
 * FAIL-SOFT for the API: boots without a broker, `publish` returns false and warns once per distinct
 * error, and a background loop keeps reconnecting with capped backoff. The worker layers fail-FAST on
 * top via `isConnected()` + `onClose()` — a consumer with no broker must not run silently.
 */
@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(QueueService.name);
  private conn?: AmqpConnectionLike;
  private channel?: AmqpChannelLike;
  private consumerTag?: string;
  private closing = false;
  private attempt = 0;
  private timer?: NodeJS.Timeout;
  private lastWarned?: string;
  private readonly closeListeners: (() => void)[] = [];

  constructor(
    @Inject(AMQP_CONNECT) private readonly connect: AmqpConnect,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.open();
  }

  async onModuleDestroy(): Promise<void> {
    this.closing = true;
    if (this.timer) clearTimeout(this.timer);
    await this.cancel().catch(() => undefined);
    await this.channel?.close().catch(() => undefined);
    await this.conn?.close().catch(() => undefined);
    this.channel = undefined;
    this.conn = undefined;
  }

  isConnected(): boolean {
    return this.channel !== undefined;
  }

  /** Registers a listener for "the broker connection went away". The worker exits on it. */
  onClose(listener: () => void): void {
    this.closeListeners.push(listener);
  }

  /** Fire-and-forget. `false` means "not published" — callers never see a throw. */
  publish(
    routingKey: string,
    message: unknown,
    opts: { headers?: AmqpHeaders; messageId?: string } = {},
  ): boolean {
    if (!this.channel) {
      this.warn(new Error('not connected'));
      return false;
    }
    try {
      return this.channel.publish(EXCHANGES.events, routingKey, Buffer.from(JSON.stringify(message)), {
        persistent: true, // survives a broker restart (the queue is durable too)
        contentType: 'application/json',
        ...(opts.headers ? { headers: opts.headers } : {}),
        ...(opts.messageId ? { messageId: opts.messageId } : {}), // M16d: = outbox row id
      });
    } catch (e) {
      this.warn(e);
      return false;
    }
  }

  /** Worker side. prefetch = max unacked messages this consumer holds at once. */
  async consume(handler: (msg: AmqpMessage) => Promise<void>, prefetch = 10): Promise<void> {
    if (!this.channel) throw new Error('QueueService: not connected');
    await this.channel.prefetch(prefetch);
    const { consumerTag } = await this.channel.consume(
      QUEUES.notificationsPush,
      (msg) => {
        if (msg) void handler(msg); // the handler acks/nacks; a null msg = consumer cancelled
      },
      { noAck: false },
    );
    this.consumerTag = consumerTag;
  }

  ack(msg: AmqpMessage): void {
    this.channel?.ack(msg);
  }

  /** requeue defaults to false: a bad message must not spin forever (retries/DLQ are M16c). */
  nack(msg: AmqpMessage, requeue = false): void {
    this.channel?.nack(msg, false, requeue);
  }

  /** Stop receiving new deliveries (in-flight ones can still be acked). */
  async cancel(): Promise<void> {
    if (this.channel && this.consumerTag) await this.channel.cancel(this.consumerTag);
    this.consumerTag = undefined;
  }

  /** Test support: simulate "broker unreachable" — drop the connection WITHOUT scheduling a reconnect. */
  async disconnectForTest(): Promise<void> {
    this.closing = true;
    await this.cancel().catch(() => undefined);
    await this.channel?.close().catch(() => undefined);
    await this.conn?.close().catch(() => undefined);
    this.channel = undefined;
    this.conn = undefined;
    this.closing = false;
  }

  /** Test support: the broker is "back". */
  async reconnectForTest(): Promise<void> {
    await this.open();
  }

  /** M17 health/metrics: messages sitting in a queue, or null when disconnected. Never throws. */
  async depth(queue: string): Promise<number | null> {
    if (!this.channel) return null;
    try {
      return (await this.channel.checkQueue(queue)).messageCount;
    } catch (e) {
      this.warn(e);
      return null;
    }
  }

  /** Test support: pull ONE message from any queue (ack'd immediately), or false if empty. */
  async peek(queue: string): Promise<AmqpMessage | false> {
    if (!this.channel) return false;
    return this.channel.get(queue, { noAck: true });
  }

  /** Test support: empty the queue (the integration lane runs this per test on vhost "test"). */
  async purge(): Promise<void> {
    await this.channel?.purgeQueue(QUEUES.notificationsPush);
  }

  private async open(): Promise<void> {
    try {
      // M17: no localhost fallback — RABBITMQ_URL is required (dev in .env; prod = CloudAMQP amqps://).
      const url = this.config.getOrThrow<string>('RABBITMQ_URL');
      const conn = await this.connect(url);
      const channel = await conn.createChannel();
      // Idempotent: asserting existing objects with the SAME options is a no-op on the broker.
      // (Queue ARGUMENTS are immutable — changing them needs delete + recreate. See M16c notes.)
      await channel.assertExchange(EXCHANGES.events, 'topic', { durable: true });
      // M16c: dead-letter exchange + the problem tray. Nothing consumes the dead queue; a person does.
      await channel.assertExchange(EXCHANGES.dlx, 'direct', { durable: true });
      await channel.assertQueue(QUEUES.notificationsPushDead, { durable: true });
      await channel.bindQueue(QUEUES.notificationsPushDead, EXCHANGES.dlx, ROUTING_KEYS.notificationPushDead);
      // Main queue: what the consumer nacks (no requeue) is routed to the DLX instead of dropped.
      await channel.assertQueue(QUEUES.notificationsPush, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': EXCHANGES.dlx,
          'x-dead-letter-routing-key': ROUTING_KEYS.notificationPushDead,
        },
      });
      await channel.bindQueue(QUEUES.notificationsPush, EXCHANGES.events, ROUTING_KEYS.notificationPush);
      // Retry queues: no consumer; a message parks until the queue TTL, then is dead-lettered BACK
      // into wallet.events with the main key — i.e. it reappears on the main queue. One per delay.
      for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
        const n = i + 1;
        await channel.assertQueue(QUEUES.notificationsPushRetry(n), {
          durable: true,
          arguments: {
            'x-message-ttl': RETRY_DELAYS_MS[i],
            'x-dead-letter-exchange': EXCHANGES.events,
            'x-dead-letter-routing-key': ROUTING_KEYS.notificationPush,
          },
        });
        await channel.bindQueue(
          QUEUES.notificationsPushRetry(n),
          EXCHANGES.events,
          ROUTING_KEYS.notificationPushRetry(n),
        );
      }
      conn.on('error', () => undefined); // 'close' always follows; an unhandled 'error' would crash Node
      conn.on('close', () => this.onConnectionClosed());
      this.conn = conn;
      this.channel = channel;
      this.attempt = 0;
      this.lastWarned = undefined;
      this.log.log(`Connected to RabbitMQ — exchange ${EXCHANGES.events}, queue ${QUEUES.notificationsPush}`);
    } catch (e) {
      this.warn(e);
      this.scheduleReconnect();
    }
  }

  private onConnectionClosed(): void {
    this.channel = undefined;
    this.conn = undefined;
    this.consumerTag = undefined;
    if (this.closing) return; // our own onModuleDestroy — not a loss, nobody needs telling
    this.closeListeners.forEach((l) => l());
    this.warn(new Error('connection closed'));
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.closing || this.timer) return;
    this.attempt += 1;
    const delay = Math.min(this.attempt * 500, RECONNECT_CAP_MS);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.open();
    }, delay);
  }

  // One warning per distinct error, not one per request — a down broker must not flood the log.
  private warn(e: unknown): void {
    const msg = e instanceof Error ? e.message || e.name : String(e);
    if (msg === this.lastWarned) return;
    this.lastWarned = msg;
    this.log.warn(`RabbitMQ unavailable — ${msg}`);
  }
}
