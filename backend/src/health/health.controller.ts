import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  // 503 ONLY when Postgres is down — the one dependency the app cannot serve without.
  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    const report = await this.health.check();
    if (report.db === 'down') res.status(503);
    return report;
  }
}
