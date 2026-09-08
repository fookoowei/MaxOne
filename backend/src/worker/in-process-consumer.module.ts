import { BeforeApplicationShutdown, Injectable, Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { QueueService } from '../queue/queue.service';
import { NotificationConsumer } from './notification.consumer';

/**
 * Runs NotificationConsumer inside the API process (CONSUMER_IN_PROCESS=true). Unlike the
 * standalone worker (fail-FAST: exit on broker loss, supervisor restarts), the API must keep
 * serving HTTP — so this is fail-SOFT: subscribe whenever the queue (re)opens, drain on shutdown.
 */
@Injectable()
export class InProcessConsumerRunner implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly log = new Logger(InProcessConsumerRunner.name);

  constructor(
    private readonly queue: QueueService,
    private readonly consumer: NotificationConsumer,
  ) {}

  onApplicationBootstrap(): void {
    this.queue.onOpen(() => void this.subscribe('reconnect'));
    if (this.queue.isConnected()) void this.subscribe('boot');
    else this.log.warn('broker not connected at boot — consumer will subscribe when it is');
  }

  async beforeApplicationShutdown(): Promise<void> {
    await this.consumer.stop();
  }

  private async subscribe(when: string): Promise<void> {
    try {
      await this.consumer.start();
      this.log.log(`in-process consumer subscribed (${when})`);
    } catch (e) {
      this.log.warn(`in-process consumer could not subscribe (${when}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

@Module({
  imports: [PushModule], // Cache + Queue are global
  providers: [NotificationConsumer, InProcessConsumerRunner],
})
export class InProcessConsumerModule {}
