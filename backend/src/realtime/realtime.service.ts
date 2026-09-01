import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

export interface BalancePayload {
  walletId: string;
  currency: string;
  balance: number;
}

// Domain-facing emit API — the wallet service calls this after a settle commits.
@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitBalance(userId: string, payload: BalancePayload): void {
    this.gateway.server.to(`user:${userId}`).emit('balance.updated', payload);
  }
}
