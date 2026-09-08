import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { WorkerModule } from './worker/worker.module';
import { QueueService } from './queue/queue.service';
import { NotificationConsumer } from './worker/notification.consumer';
import { initSentry } from './observability/sentry';

/**
 * Second entrypoint, same codebase: no HTTP server, just the consume loop.
 * Fail-FAST (unlike the API): no broker at boot, or the connection dropping later, → exit 1 and let
 * the supervisor (compose `restart: unless-stopped`) bring us back. A worker that runs with nothing
 * to consume would hide a broken broker.
 */
async function bootstrap() {
  initSentry('worker');
  const log = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  const queue = app.get(QueueService);
  const consumer = app.get(NotificationConsumer);

  if (!queue.isConnected()) {
    log.error('RabbitMQ not reachable at boot — exiting (supervisor will restart)');
    await app.close();
    process.exit(1);
  }
  queue.onClose(() => {
    log.error('RabbitMQ connection lost — exiting (supervisor will restart)');
    process.exit(1);
  });

  // Graceful stop: cancel consumer → drain in-flight → close channel/connection/Prisma → exit 0.
  const shutdown = async (signal: string) => {
    log.log(`${signal} received — draining`);
    await consumer.stop();
    await app.close();
    process.exit(0);
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));

  await consumer.start();
  log.log('Worker up');
}
bootstrap();
