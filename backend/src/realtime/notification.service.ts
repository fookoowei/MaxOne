import { Injectable } from '@nestjs/common';
import { RealtimeService, type NotificationPayload } from './realtime.service';
import { PushService } from '../push/push.service';

// One delivery call → both transports. Open tab gets the socket toast; closed app gets Web Push.
@Injectable()
export class NotificationService {
  constructor(
    private readonly realtime: RealtimeService,
    private readonly push: PushService,
  ) {}

  async notify(userId: string, payload: NotificationPayload): Promise<void> {
    this.realtime.emitNotification(userId, payload);
    await this.push.sendToUser(userId, payload);
  }
}
