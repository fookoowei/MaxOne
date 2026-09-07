import * as Sentry from '@sentry/node';
import { _resetSentryForTest, captureException, captureMessage, initSentry, isSentryEnabled } from './sentry';

jest.mock('@sentry/node', () => ({ init: jest.fn(), captureException: jest.fn(), captureMessage: jest.fn() }));

describe('sentry helper (M17)', () => {
  const dsn = process.env.SENTRY_DSN;
  afterEach(() => {
    _resetSentryForTest();
    process.env.SENTRY_DSN = dsn;
    jest.clearAllMocks();
  });

  it('without SENTRY_DSN: init returns false and every capture is a no-op', () => {
    delete process.env.SENTRY_DSN;
    expect(initSentry('api')).toBe(false);
    expect(isSentryEnabled()).toBe(false);
    captureException(new Error('x'));
    captureMessage('y');
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('with SENTRY_DSN: init configures release/environment/serverName and captures forward', () => {
    process.env.SENTRY_DSN = 'https://k@o.ingest.sentry.io/1';
    process.env.RENDER_GIT_COMMIT = 'abc123';
    expect(initSentry('worker')).toBe(true);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://k@o.ingest.sentry.io/1', release: 'abc123', serverName: 'worker' }),
    );
    captureException('plain string', { a: 1 });
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), { extra: { a: 1 } });
    captureMessage('dead letters', 'warning');
    expect(Sentry.captureMessage).toHaveBeenCalledWith('dead letters', { level: 'warning', extra: {} });
    delete process.env.RENDER_GIT_COMMIT;
  });
});
