import type { NextFunction, Request, Response } from 'express';
import { auditContext } from './audit.context';

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
 */
export function auditContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  auditContext.run(
    { ipAddress: req.ip ?? null, userAgent: req.get('user-agent') ?? null },
    () => next(),
  );
}
