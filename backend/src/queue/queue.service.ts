import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AMQP_CONNECT,
  type AmqpChannelLike,
  type AmqpConnect,
  type AmqpConnectionLike,
  type AmqpMessage,
} from './amqp.types';
import { EXCHANGE, QUEUES, ROUTING_KEYS } from './events';

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
  publish(routingKey: string, message: unknown): boolean {
    if (!this.channel) {
      this.warn(new Error('not connected'));
      return false;
    }
    try {
      return this.channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(message)), {
        persistent: true, // survives a broker restart (the queue is durable too)
        contentType: 'application/json',
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

  /** Test support: empty the queue (the integration lane runs this per test on vhost "test"). */
  async purge(): Promise<void> {
    await this.channel?.purgeQueue(QUEUES.notificationsPush);
  }

  private async open(): Promise<void> {
    try {
      const url = this.config.get<string>('RABBITMQ_URL') ?? 'amqp://guest:guest@localhost:5672/';
      const conn = await this.connect(url);
      const channel = await conn.createChannel();
      // Idempotent: asserting existing objects with the same options is a no-op on the broker.
      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
      await channel.assertQueue(QUEUES.notificationsPush, { durable: true });
      await channel.bindQueue(QUEUES.notificationsPush, EXCHANGE, ROUTING_KEYS.notificationPush);
      conn.on('error', () => undefined); // 'close' always follows; an unhandled 'error' would crash Node
      conn.on('close', () => this.onConnectionClosed());
      this.conn = conn;
      this.channel = channel;
      this.attempt = 0;
      this.lastWarned = undefined;
      this.log.log(`Connected to RabbitMQ — exchange ${EXCHANGE}, queue ${QUEUES.notificationsPush}`);
    } catch (e) {
      this.warn(e);
      this.scheduleReconnect();
    }
  }

  private onConnectionClosed(): void {
    this.channel = undefined;
    this.conn = undefined;
    this.consumerTag = undefined;
    this.closeListeners.forEach((l) => l());
    if (!this.closing) {
      this.warn(new Error('connection closed'));
      this.scheduleReconnect();
    }
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
