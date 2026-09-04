import { HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** The ONE error shape every endpoint returns (see docs: M15c). Clients branch on `code`. */
export interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: string[]; // validation only: the per-field class-validator messages
  path: string;
  timestamp: string;
}

const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_ERROR',
};

const codeFor = (status: number) => CODE_BY_STATUS[status] ?? `HTTP_${status}`;

/**
 * Pure mapping: any thrown value → ErrorBody. Kept free of Nest's request/response so it can be
 * unit-tested as a plain function; the filter is a thin adapter around it.
 */
export function toErrorBody(exception: unknown, path: string, now: Date = new Date()): ErrorBody {
  const base = { path, timestamp: now.toISOString() };

  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const res = exception.getResponse();
    // Nest exceptions carry either a plain string or an object ({ message, code?, ... }).
    const obj = typeof res === 'object' && res !== null ? (res as Record<string, unknown>) : {};
    const raw = typeof res === 'string' ? res : obj.message;
    const code = typeof obj.code === 'string' ? obj.code : undefined;

    if (Array.isArray(raw)) {
      // ValidationPipe: one message per failed rule → VALIDATION_FAILED with the list preserved.
      const details = raw.map(String);
      return { statusCode, code: code ?? 'VALIDATION_FAILED', message: details.join('; '), details, ...base };
    }
    const message = typeof raw === 'string' && raw ? raw : exception.message;
    return { statusCode, code: code ?? codeFor(statusCode), message, ...base };
  }

  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    // The two Prisma errors a handler can legitimately hit AFTER validation passed.
    if (exception.code === 'P2025') {
      return { statusCode: HttpStatus.NOT_FOUND, code: 'NOT_FOUND', message: 'Record not found', ...base };
    }
    if (exception.code === 'P2002') {
      return { statusCode: HttpStatus.CONFLICT, code: 'CONFLICT', message: 'Already exists', ...base };
    }
  }

  // Everything else is a bug or an outage: never echo its message/stack to the client.
  return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL_ERROR', message: 'Internal server error', ...base };
}
