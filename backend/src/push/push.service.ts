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

  // System-level (called by the worker's consumer). Tries EVERY subscription, then:
  //  - 410/404 = the browser unsubscribed → prune the row silently (permanent, not a failure)
  //  - anything else (5xx, network) is transient → THROW after the loop so the queue retries.
  // (M16b swallowed everything; M16c needs the failure to surface or a retry can never happen.)
  async sendToUser(userId: string, payload: NotificationPayload): Promise<void> {
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    const transient: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload),
          );
        } catch (err: unknown) {
          const e = err as { statusCode?: number; message?: string };
          if (e.statusCode === 410 || e.statusCode === 404) {
            await this.prisma.pushSubscription.deleteMany({ where: { endpoint: s.endpoint } });
          } else {
            transient.push(`${e.statusCode ?? 'network'}: ${e.message ?? 'send failed'}`);
          }
        }
      }),
    );
    if (transient.length > 0) {
      throw new Error(`push failed for ${transient.length}/${subs.length} subscription(s): ${transient[0]}`);
    }
  }
}
