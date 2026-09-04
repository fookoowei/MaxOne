import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { IdempotencyService } from './idempotency.service';
import { IDEMPOTENCY_META, type IdempotentOptions } from './idempotent.decorator';

export const IDEMPOTENCY_HEADER = 'idempotency-key';

interface Req {
  user?: { id: string };
  headers: Record<string, string | undefined>;
  method: string;
  originalUrl?: string;
  url: string;
  body: unknown;
}
interface Res {
  statusCode: number;
  status: (code: number) => unknown;
}

// Guards run before interceptors, so req.user is already set. Flow: reserve the key →
// replay / 409 / run-then-complete (release on error).
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly idem: IdempotencyService,
    private readonly reflector: Reflector,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const opts =
      this.reflector.get<IdempotentOptions>(IDEMPOTENCY_META, ctx.getHandler()) ?? { required: true };
    const http = ctx.switchToHttp();
    const req = http.getRequest<Req>();
    const res = http.getResponse<Res>();

    const key = req.headers[IDEMPOTENCY_HEADER];
    if (!key) {
      if (opts.required) {
        throw new BadRequestException({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Idempotency-Key header is required' });
      }
      return next.handle();
    }
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('Idempotency requires an authenticated user');

    // The key means THIS exact request: method + path + body.
    const fingerprint = createHash('sha256')
      .update(`${req.method} ${req.originalUrl ?? req.url} ${JSON.stringify(req.body ?? {})}`)
      .digest('hex');

    return from(this.idem.reserve(userId, key, fingerprint)).pipe(
      mergeMap((r) => {
        if (r.kind === 'replay') {
          res.status(r.statusCode);
          return of(r.body); // the original response, handler NOT run
        }
        if (r.kind === 'mismatch') {
          return throwError(
            () =>
              new ConflictException({
                code: 'IDEMPOTENCY_CONFLICT',
                message: 'Idempotency-Key was already used for a different request',
              }),
          );
        }
        if (r.kind === 'in_progress') {
          return throwError(
            () =>
              new ConflictException({
                code: 'IDEMPOTENCY_CONFLICT',
                message: 'A request with this Idempotency-Key is still in progress',
              }),
          );
        }
        const id = r.id;
        return next.handle().pipe(
          mergeMap((body) => from(this.idem.complete(id, res.statusCode, body)).pipe(mergeMap(() => of(body)))),
          catchError((err) => from(this.idem.release(id)).pipe(mergeMap(() => throwError(() => err)))),
        );
      }),
    );
  }
}
