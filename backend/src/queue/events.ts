import type { NotificationPayload } from '../realtime/realtime.service';

// ONE place for the names. Producer, consumer and tests all import from here.
export const EXCHANGES = {
  events: 'wallet.events', // topic: routing key = "<domain>.<what>"; everything publishes here
  dlx: 'wallet.dlx', // direct: dead-letter exchange — where the main queue sends what it gives up on
} as const;
/** @deprecated alias kept for M16b imports — prefer EXCHANGES.events */
export const EXCHANGE = EXCHANGES.events;

// M16c: retry with backoff. One retry queue PER delay (TTL expiry is head-of-queue only — mixed
// per-message TTLs in one queue would block each other). Each retry queue dead-letters back into
// wallet.events with the main routing key, so the message simply reappears on the main queue.
export const RETRY_DELAYS_MS = [5_000, 30_000, 120_000] as const;
export const MAX_RETRIES = RETRY_DELAYS_MS.length;
export const HEADER_RETRY_COUNT = 'x-retry-count';

export const QUEUES = {
  notificationsPush: 'notifications.push',
  notificationsPushDead: 'notifications.push.dead', // the problem tray — no consumer, a person looks
  notificationsPushRetry: (n: number) => `notifications.push.retry.${n}`,
} as const;
export const ROUTING_KEYS = {
  notificationPush: 'notification.push',
  notificationPushDead: 'notification.push.dead',
  notificationPushRetry: (n: number) => `notification.push.retry.${n}`,
} as const;

/** Plain JSON on the wire — no framework envelope, so a Python consumer reads it as-is. */
export interface NotificationPushEvent {
  id: string; // uuid — the idempotent consumer dedupes redeliveries on it
  type: typeof ROUTING_KEYS.notificationPush;
  occurredAt: string; // ISO
  userId: string;
  payload: NotificationPayload;
  requestId?: string; // M17: the HTTP request that caused it (absent for tick-driven events)
}

/** Parse + validate a raw message body. Throws on anything the consumer must not act on. */
export function parseNotificationPushEvent(raw: string): NotificationPushEvent {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    throw new Error('notification.push: body is not JSON');
  }
  const e = obj as Partial<NotificationPushEvent> | null;
  if (
    !e ||
    typeof e.id !== 'string' ||
    e.type !== ROUTING_KEYS.notificationPush ||
    typeof e.userId !== 'string' ||
    !e.payload ||
    typeof e.payload.title !== 'string' ||
    typeof e.payload.body !== 'string'
  ) {
    throw new Error('notification.push: bad shape');
  }
  return e as NotificationPushEvent;
}
