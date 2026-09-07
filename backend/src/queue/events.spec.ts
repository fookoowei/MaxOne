import { parseNotificationPushEvent, ROUTING_KEYS } from './events';

describe('parseNotificationPushEvent', () => {
  const good = {
    id: '11111111-1111-1111-1111-111111111111',
    type: ROUTING_KEYS.notificationPush,
    occurredAt: '2026-09-07T00:00:00.000Z',
    userId: 'u1',
    payload: { title: 'Deposit approved', body: '$100.00 added', tag: 'tx1', url: '/wallet' },
  };

  it('returns the event for a well-formed body', () => {
    expect(parseNotificationPushEvent(JSON.stringify(good))).toEqual(good);
  });

  it('throws on non-JSON', () => {
    expect(() => parseNotificationPushEvent('{not json')).toThrow('not JSON');
  });

  it.each([
    ['missing userId', { ...good, userId: undefined }],
    ['wrong type', { ...good, type: 'balance.updated' }],
    ['payload without title', { ...good, payload: { body: 'x' } }],
    ['null', null],
  ])('throws on bad shape: %s', (_name, bad) => {
    expect(() => parseNotificationPushEvent(JSON.stringify(bad))).toThrow('bad shape');
  });
});
