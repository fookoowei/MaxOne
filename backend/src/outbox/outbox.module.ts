import { Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';

// API only. Not global on purpose: the worker must never load the relay (it would double-publish
// what the API relays). PrismaModule and QueueModule are global, so nothing to import here.
@Module({
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
