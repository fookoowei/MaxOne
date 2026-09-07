import { Module } from '@nestjs/common';
import { OpsWatchService } from './ops-watch.service';
import { MetricsController } from './metrics.controller';

// API only: the worker has no HTTP surface and must not run a second watcher.
@Module({
  controllers: [MetricsController],
  providers: [OpsWatchService],
  exports: [OpsWatchService],
})
export class ObservabilityModule {}
