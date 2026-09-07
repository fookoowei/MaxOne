import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { OpsWatchService } from './ops-watch.service';

// Prometheus text exposition. Unauthenticated on purpose (numbers only, no PII) — scrape it, or
// just curl it to see the M16 health numbers.
@Controller('metrics')
export class MetricsController {
  constructor(private readonly ops: OpsWatchService) {}

  @Get()
  async metrics(@Res() res: Response): Promise<void> {
    res.setHeader('content-type', this.ops.registry.contentType);
    res.send(await this.ops.registry.metrics());
  }
}
