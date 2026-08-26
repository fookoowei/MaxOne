import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/jwt.strategy';

@Injectable()
export class WatchlistService {
  constructor(private readonly prisma: PrismaService) {}

  list(actor: AuthUser) {
    return this.prisma.watchlistItem.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Idempotent: upsert on the (userId, symbol) unique — re-starring never errors.
  add(actor: AuthUser, dto: { symbol: string; type: string }) {
    return this.prisma.watchlistItem.upsert({
      where: { userId_symbol: { userId: actor.id, symbol: dto.symbol } },
      create: { userId: actor.id, symbol: dto.symbol, type: dto.type },
      update: {},
    });
  }

  // Idempotent: removing an un-followed asset deletes 0 rows, not an error.
  remove(actor: AuthUser, symbol: string) {
    return this.prisma.watchlistItem.deleteMany({ where: { userId: actor.id, symbol } });
  }
}
