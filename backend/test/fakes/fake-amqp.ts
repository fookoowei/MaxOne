import type {
  AmqpChannelLike,
  AmqpConnectionLike,
  AmqpHeaders,
  AmqpMessage,
} from '../../src/queue/amqp.types';

export interface PublishedRecord {
  exchange: string;
  routingKey: string;
  body: unknown;
  opts: { persistent: boolean; contentType: string; headers?: AmqpHeaders };
}

/** In-memory amqplib stand-in: records topology calls + publishes, lets a test push messages in. */
export function fakeAmqp() {
  const published: PublishedRecord[] = [];
  const asserted: string[] = [];
  const queueArgs: Record<string, Record<string, unknown> | undefined> = {};
  const acked: AmqpMessage[] = [];
  const nacked: { msg: AmqpMessage; requeue: boolean }[] = [];
  const closeListeners: (() => void)[] = [];
  let onMessage: ((msg: AmqpMessage | null) => void) | undefined;
  let prefetch = 0;
  let cancelled = false;
  let purged = 0;

  const channel: AmqpChannelLike = {
    assertExchange: async (name) => {
      asserted.push(`exchange:${name}`);
    },
    assertQueue: async (name, opts) => {
      asserted.push(`queue:${name}`);
      queueArgs[name] = opts.arguments;
    },
    bindQueue: async (q, ex, key) => {
      asserted.push(`bind:${q}<-${ex}:${key}`);
    },
    publish: (exchange, routingKey, content, opts) => {
      published.push({ exchange, routingKey, body: JSON.parse(content.toString()), opts });
      return true;
    },
    prefetch: async (n) => {
      prefetch = n;
    },
    consume: async (_queue, handler) => {
      onMessage = handler;
      return { consumerTag: 'ctag-1' };
    },
    cancel: async () => {
      cancelled = true;
    },
    ack: (msg) => {
      acked.push(msg);
    },
    nack: (msg, _all, requeue) => {
      nacked.push({ msg, requeue });
    },
    get: async () => false,
    purgeQueue: async () => {
      purged++;
    },
    close: async () => undefined,
    on: () => undefined,
  };
  const connection: AmqpConnectionLike = {
    createChannel: async () => channel,
    close: async () => undefined,
    on: (event, listener) => {
      if (event === 'close') closeListeners.push(listener as () => void);
    },
  };

  return {
    connect: async () => connection,
    channel,
    published,
    asserted,
    queueArgs,
    acked,
    nacked,
    get prefetch() {
      return prefetch;
    },
    get cancelled() {
      return cancelled;
    },
    get purged() {
      return purged;
    },
    /** Simulate the broker delivering one message to the registered consumer. */
    deliver(body: unknown, headers: AmqpHeaders = {}): AmqpMessage {
      const msg: AmqpMessage = {
        content: Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)),
        fields: {
          deliveryTag: acked.length + nacked.length + 1,
          redelivered: false,
          routingKey: 'notification.push',
        },
        properties: { contentType: 'application/json', headers },
      };
      if (!onMessage) throw new Error('no consumer registered');
      onMessage(msg);
      return msg;
    },
    /** Simulate the broker dropping the connection. */
    dropConnection() {
      closeListeners.forEach((l) => l());
    },
  };
}

/** A connect() that always fails — for fail-soft tests. */
export const brokenConnect = async (): Promise<AmqpConnectionLike> => {
  throw new Error('ECONNREFUSED 5672');
};
