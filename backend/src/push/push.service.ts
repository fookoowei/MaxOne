import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/jwt.strategy';
import type { NotificationPayload } from '../realtime/realtime.service';

interface SubscribeInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

@Injectable()
export class PushService {
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    webpush.setVapidDetails(
      config.getOrThrow<string>('VAPID_SUBJECT'),
      config.getOrThrow<string>('VAPID_PUBLIC_KEY'),
      config.getOrThrow<string>('VAPID_PRIVATE_KEY'),
    );
  }

  subscribe(actor: AuthUser, dto: SubscribeInput) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: { userId: actor.id, endpoint: dto.endpoint, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
      update: { userId: actor.id, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
    });
  }

  unsubscribe(actor: AuthUser, endpoint: string) {
    return this.prisma.pushSubscription.deleteMany({ where: { endpoint, userId: actor.id } });
  }

  // System-level (called by the alert check). Fail-soft: never throws; prunes dead endpoints.
  async sendToUser(userId: string, payload: NotificationPayload): Promise<void> {
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload),
          );
        } catch (err: unknown) {
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 410 || code === 404) {
            await this.prisma.pushSubscription.deleteMany({ where: { endpoint: s.endpoint } });
          }
        }
      }),
    );
  }
}
