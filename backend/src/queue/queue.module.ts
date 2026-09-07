import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as amqp from 'amqplib';
import { AMQP_CONNECT, type AmqpConnect, type AmqpConnectionLike } from './amqp.types';
import { QueueService } from './queue.service';

/**
 * Global (like CacheModule): single-instance infrastructure any feature may publish through.
 * The real amqplib.connect is behind the AMQP_CONNECT token so specs inject an in-memory fake.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: AMQP_CONNECT,
      // amqplib's ChannelModel is a superset of AmqpConnectionLike; the cast only narrows the
      // `on()` overloads to the two events we listen for.
      useValue: ((url: string) => amqp.connect(url) as unknown as Promise<AmqpConnectionLike>) as AmqpConnect,
    },
    QueueService,
  ],
  exports: [QueueService],
})
export class QueueModule {}
