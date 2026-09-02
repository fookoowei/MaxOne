import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { PushService } from './push.service';
import { SubscribeDto, UnsubscribeDto } from './dto/subscribe.dto';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('subscribe')
  @HttpCode(204)
  async subscribe(@CurrentUser() actor: AuthUser, @Body() dto: SubscribeDto) {
    await this.push.subscribe(actor, dto);
  }

  @Post('unsubscribe')
  @HttpCode(204)
  async unsubscribe(@CurrentUser() actor: AuthUser, @Body() dto: UnsubscribeDto) {
    await this.push.unsubscribe(actor, dto.endpoint);
  }
}
