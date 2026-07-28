import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { auditContextMiddleware } from './audit/audit.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // First in the chain: every downstream guard, controller and service runs inside the
  // request-scoped audit context.
  app.use(auditContextMiddleware);
  // Parse cookies so the JWT strategy can read the access token from the httpOnly cookie.
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
