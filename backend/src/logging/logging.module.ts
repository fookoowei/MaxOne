import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';

/**
 * M17: structured logging. JSON lines in production (one object per line, machine-readable —
 * Render/Vercel log drains and any aggregator index them); pretty single-line in dev.
 * The request id comes from auditContextMiddleware (it runs first and sets req.id), so pino's
 * `reqId` matches the `x-request-id` the client received and the id stamped onto outbox events.
 * Shared by the API and the worker (SERVICE_NAME tells them apart).
 */
export const LoggingModule = LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? 'info',
    genReqId: (req) => (req as { id?: string }).id ?? randomUUID(),
    // Compact: method/url/id in, status out. The defaults dump every header on every line.
    serializers: {
      req: (req: { id?: string; method?: string; url?: string; remoteAddress?: string }) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        ip: req.remoteAddress,
      }),
      res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
    },
    customProps: () => ({ service: process.env.SERVICE_NAME ?? 'api' }),
    autoLogging: {
      ignore: (req) => req.url === '/health' || req.url === '/metrics', // probes would drown everything
    },
    transport:
      process.env.NODE_ENV === 'production'
        ? undefined
        : { target: 'pino-pretty', options: { singleLine: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
  },
});
