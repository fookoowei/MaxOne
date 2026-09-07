import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PushModule } from '../push/push.module';
import { QueueModule } from '../queue/queue.module';
import { NotificationConsumer } from './notification.consumer';

/**
 * Only what the consumer needs. Booting AppModule here would start the Socket.IO gateway (no HTTP
 * server to attach to) and a second price tick (double-polling CoinGecko).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    PrismaModule,
    PushModule,
    QueueModule,
  ],
  providers: [NotificationConsumer],
})
export class WorkerModule {}
