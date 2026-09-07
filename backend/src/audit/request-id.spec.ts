import { auditContextMiddleware } from './audit.middleware';
import { getAuditContext } from './audit.context';

function fakeReq(headers: Record<string, string> = {}) {
  return { get: (h: string) => headers[h.toLowerCase()], ip: '1.2.3.4' } as any;
}
function fakeRes() {
  const headers: Record<string, string> = {};
  return { headers, setHeader: (k: string, v: string) => (headers[k] = v) } as any;
}

describe('auditContextMiddleware request id (M17)', () => {
  it('honours an incoming x-request-id, stores it, sets req.id, echoes it', () => {
    const req = fakeReq({ 'x-request-id': 'abc-123' });
    const res = fakeRes();
    let seen = '';
    auditContextMiddleware(req, res, () => {
      seen = getAuditContext().requestId;
    });
    expect(seen).toBe('abc-123');
    expect(req.id).toBe('abc-123');
    expect(res.headers['x-request-id']).toBe('abc-123');
  });

  it('mints a uuid when none is provided', () => {
    const req = fakeReq();
    const res = fakeRes();
    let seen = '';
    auditContextMiddleware(req, res, () => {
      seen = getAuditContext().requestId;
    });
    expect(seen).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers['x-request-id']).toBe(seen);
  });

  it('outside a request the id is empty, never undefined', () => {
    expect(getAuditContext().requestId).toBe('');
  });
});
