import { AsyncLocalStorage } from 'async_hooks';

/** What the HTTP edge captures for the audit trail. */
export interface AuditContext {
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Request-scoped storage. The middleware fills it at the edge; AuditService reads it deep in the
 * call stack — so WalletsService and UsersService never have to accept transport details they
 * have no business knowing about. This is the same mechanism behind correlation IDs and tracing.
 */
export const auditContext = new AsyncLocalStorage<AuditContext>();

/**
 * Never throws. Outside an HTTP request (a job, a script, a unit test) there is simply no
 * context, and an audit entry with a null IP is far better than a failed money movement.
 */
export function getAuditContext(): AuditContext {
  return auditContext.getStore() ?? { ipAddress: null, userAgent: null };
}
