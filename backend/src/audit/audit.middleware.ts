import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { auditContext } from './audit.context';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Establishes the request-scoped audit context.
 *
 * Middleware, not an interceptor: `als.run()` must wrap the *execution* of everything
 * downstream. An interceptor returns an Observable whose handler only runs on subscription —
 * after `run()` has already exited — so the store would be silently empty.
 *
 * A plain function, not an injectable NestMiddleware class: it has no dependencies (it only
 * writes to a module-level store), so DI would be ceremony. Registered with `app.use()` in
 * main.ts rather than `AppModule.configure()`, because NestJS 11 ships Express 5 whose
 * path-to-regexp v8 rejects the bare `forRoutes('*')` wildcard.
 *
 * M17: also mints the request id (honouring an incoming `x-request-id`, e.g. from the BFF or a
 * load balancer), sets `req.id` so pino-http reuses it, and echoes it in the response so a user's
 * bug report can be matched to a log line.
 */
export function auditContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = req.get(REQUEST_ID_HEADER) || randomUUID();
  (req as Request & { id?: string }).id = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  auditContext.run(
    { requestId, ipAddress: req.ip ?? null, userAgent: req.get('user-agent') ?? null },
    () => next(),
  );
}
