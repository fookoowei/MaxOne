import type { NotificationPayload } from '../realtime/realtime.service';

// ONE place for the names. Producer, consumer and tests all import from here.
export const EXCHANGE = 'wallet.events'; // topic exchange: routing key = "<domain>.<what>"
export const QUEUES = { notificationsPush: 'notifications.push' } as const;
export const ROUTING_KEYS = { notificationPush: 'notification.push' } as const;

/** Plain JSON on the wire — no framework envelope, so a Python consumer reads it as-is. */
export interface NotificationPushEvent {
  id: string; // uuid — M16c dedupes redeliveries on it
  type: typeof ROUTING_KEYS.notificationPush;
  occurredAt: string; // ISO
  userId: string;
  payload: NotificationPayload;
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
