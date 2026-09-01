import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/jwt.strategy';

interface AlertInput {
  symbol: string;
  type: string;
  targetPrice: number;
  direction: string;
}

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  list(actor: AuthUser) {
    return this.prisma.priceAlert.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Plain create — a coin can have many alerts (no upsert/unique).
  add(actor: AuthUser, dto: AlertInput) {
    return this.prisma.priceAlert.create({
      data: {
        userId: actor.id,
        symbol: dto.symbol,
        type: dto.type,
        targetPrice: dto.targetPrice,
        direction: dto.direction,
      },
    });
  }

  // id AND userId → a user can only ever delete their own alert.
  remove(actor: AuthUser, id: string) {
    return this.prisma.priceAlert.deleteMany({ where: { id, userId: actor.id } });
  }

  // System-level (all users) — the background check, NOT actor-scoped.
  findPending() {
    return this.prisma.priceAlert.findMany({ where: { triggeredAt: null } });
  }

  markTriggered(ids: string[]) {
    return this.prisma.priceAlert.updateMany({
      where: { id: { in: ids } },
      data: { triggeredAt: new Date() },
    });
  }
}
