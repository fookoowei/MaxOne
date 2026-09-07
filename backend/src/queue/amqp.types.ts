// The slice of amqplib we touch. Specs pass an in-memory fake implementing exactly this, and the
// real client (amqplib.connect) satisfies it structurally.
export interface AmqpMessage {
  content: Buffer;
  fields: { deliveryTag: number; redelivered: boolean; routingKey: string };
  properties: { messageId?: string; contentType?: string };
}

export interface AmqpChannelLike {
  assertExchange(name: string, type: string, opts: { durable: boolean }): Promise<unknown>;
  assertQueue(name: string, opts: { durable: boolean }): Promise<unknown>;
  bindQueue(queue: string, exchange: string, pattern: string): Promise<unknown>;
  publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    opts: { persistent: boolean; contentType: string; messageId?: string },
  ): boolean;
  prefetch(count: number): Promise<unknown>;
  consume(
    queue: string,
    onMessage: (msg: AmqpMessage | null) => void,
    opts: { noAck: boolean },
  ): Promise<{ consumerTag: string }>;
  cancel(consumerTag: string): Promise<unknown>;
  ack(msg: AmqpMessage): void;
  nack(msg: AmqpMessage, allUpTo: boolean, requeue: boolean): void;
  purgeQueue(queue: string): Promise<unknown>;
  close(): Promise<void>;
  on(event: 'error' | 'close', listener: (...args: unknown[]) => void): unknown;
}

export interface AmqpConnectionLike {
  createChannel(): Promise<AmqpChannelLike>;
  close(): Promise<void>;
  on(event: 'error' | 'close', listener: (...args: unknown[]) => void): unknown;
}

export type AmqpConnect = (url: string) => Promise<AmqpConnectionLike>;
export const AMQP_CONNECT = 'AMQP_CONNECT';
