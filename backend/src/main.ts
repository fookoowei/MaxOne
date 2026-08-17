import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { auditContextMiddleware } from './audit/audit.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Security headers on every response (HSTS, nosniff, frame options, …). Safe for a JSON API.
  app.use(helmet());
  // Default-deny CORS. The browser never calls this API directly (it goes through the Next BFF,
  // server-to-server), so this is hygiene/future-proofing — allow only a configured origin.
  app.enableCors({ origin: process.env.FRONTEND_ORIGIN ?? false, credentials: true });
  // First in the chain: every downstream guard, controller and service runs inside the
  // request-scoped audit context.
  app.use(auditContextMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  // Bind to 0.0.0.0 (all IPv4 interfaces), not the default IPv6-only `::` — cloud hosts like
  // Render scan IPv4 for the open port, and would otherwise see "no open ports".
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
