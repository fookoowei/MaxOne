import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { auditContextMiddleware } from './audit/audit.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Security headers on every response (HSTS, nosniff, frame options, …). CSP is relaxed to allow
  // inline scripts/styles so the Swagger UI at /api-docs renders — this API serves only JSON
  // otherwise, so there's no user-facing HTML that a strict CSP would be protecting.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
        },
      },
    }),
  );
  // Default-deny CORS. The browser never calls this API directly (it goes through the Next BFF,
  // server-to-server), so this is hygiene/future-proofing — allow only a configured origin.
  app.enableCors({ origin: process.env.FRONTEND_ORIGIN ?? false, credentials: true });
  // First in the chain: every downstream guard, controller and service runs inside the
  // request-scoped audit context.
  app.use(auditContextMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // Interactive API docs (Swagger UI) at /api-docs; raw OpenAPI JSON at /api-docs-json.
  // The @nestjs/swagger CLI plugin (nest-cli.json) auto-derives request/response schemas from
  // the DTOs' types + class-validator decorators, so we don't hand-annotate every field.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MaxOne API')
    .setDescription('Wallet/ledger platform — auth, RBAC, wallets, transfers, FX, audit.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  // Bind to 0.0.0.0 (all IPv4 interfaces), not the default IPv6-only `::` — cloud hosts like
  // Render scan IPv4 for the open port, and would otherwise see "no open ports".
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
