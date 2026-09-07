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
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
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
