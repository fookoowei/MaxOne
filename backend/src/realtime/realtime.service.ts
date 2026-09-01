import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import type { MarketAsset } from '../markets/market-asset';

export interface BalancePayload {
  walletId: string;
  currency: string;
  balance: number;
}

export interface AlertPayload {
  id: string;
  symbol: string;
  direction: string;
  targetPrice: number;
  price: number;
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

  // An alert is private → room emit (like balances), not a global broadcast.
  emitAlert(userId: string, payload: AlertPayload): void {
    this.gateway.server.to(`user:${userId}`).emit('alert.triggered', payload);
  }
}
