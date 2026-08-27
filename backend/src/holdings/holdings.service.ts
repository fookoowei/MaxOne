import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/jwt.strategy';

interface HoldingInput {
  symbol: string;
  type: string;
  quantity: number;
  avgCost: number;
}

@Injectable()
export class HoldingsService {
  constructor(private readonly prisma: PrismaService) {}

  list(actor: AuthUser) {
    return this.prisma.holding.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Idempotent: one holding per (user, symbol); re-adding sets the new quantity/avgCost.
  add(actor: AuthUser, dto: HoldingInput) {
    return this.prisma.holding.upsert({
      where: { userId_symbol: { userId: actor.id, symbol: dto.symbol } },
      create: {
        userId: actor.id,
        symbol: dto.symbol,
        type: dto.type,
        quantity: dto.quantity,
        avgCost: dto.avgCost,
      },
      update: { quantity: dto.quantity, avgCost: dto.avgCost, type: dto.type },
    });
  }

  remove(actor: AuthUser, symbol: string) {
    return this.prisma.holding.deleteMany({ where: { userId: actor.id, symbol } });
  }
}
