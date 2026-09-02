import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import type { MarketAsset } from '../markets/market-asset';

export interface BalancePayload {
  walletId: string;
  currency: string;
  balance: number;
}

export interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

// Domain-facing emit API — the wallet service calls this after a settle commits.
@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitBalance(userId: string, payload: BalancePayload): void {
    this.gateway.server.to(`user:${userId}`).emit('balance.updated', payload);
  }

  // Prices are public — same for everyone — so broadcast globally (no per-user room).
  broadcastPrices(assets: MarketAsset[]): void {
    this.gateway.server.emit('prices.updated', assets);
  }

  // Cost guard input: the price loop skips the upstream fetch when nobody is connected.
  connectedCount(): number {
    return this.gateway.server.sockets.sockets.size;
  }

  // A notification is private → room emit (like balances), not a global broadcast.
  emitNotification(userId: string, payload: NotificationPayload): void {
    this.gateway.server.to(`user:${userId}`).emit('notification', payload);
  }
}
