import { auditContextMiddleware } from './audit.middleware';
import { getAuditContext } from './audit.context';

// A minimal stand-in for the parts of the Express Request we read.
const fakeReq = (ip: string | undefined, agent: string | undefined) =>
  ({ ip, get: () => agent }) as any;

describe('auditContextMiddleware', () => {
  it('makes the request ip and user-agent visible to downstream callers', () => {
    let seen: any;
    auditContextMiddleware(fakeReq('203.0.113.7', 'jest-agent'), {} as any, () => {
      seen = getAuditContext();
    });
    expect(seen).toEqual({ ipAddress: '203.0.113.7', userAgent: 'jest-agent' });
  });

  it('keeps the context across an async hop — the store follows the call chain', async () => {
    let seen: any;
    await new Promise<void>((resolve) => {
      auditContextMiddleware(fakeReq('203.0.113.7', 'jest-agent'), {} as any, async () => {
        await Promise.resolve(); // the service layer is async; the store must survive this
        seen = getAuditContext();
        resolve();
      });
    });
    expect(seen.ipAddress).toBe('203.0.113.7');
  });

  it('yields nulls outside any request rather than throwing', () => {
    // A job, a script, or a unit test has no HTTP context. Audit must still work.
    expect(getAuditContext()).toEqual({ ipAddress: null, userAgent: null });
  });
});
