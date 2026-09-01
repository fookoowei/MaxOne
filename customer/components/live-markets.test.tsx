import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { LiveMarkets } from './live-markets';
import type { MarketAsset } from './market-list';

// Capture the event handlers the island registers, so the test can fire events.
const handlers: Record<string, (p: unknown) => void> = {};
const socket = { on: (ev: string, cb: (p: unknown) => void) => { handlers[ev] = cb; }, disconnect: vi.fn() };
vi.mock('@/lib/realtime/socket', () => ({ connectSocket: () => socket }));
// MarketList renders WatchButton (a client component using useRouter).
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const btc: MarketAsset = { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 43000, change24h: 2 };

beforeEach(() => {
  for (const k of Object.keys(handlers)) delete handlers[k];
  vi.restoreAllMocks();
  vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ticket: 't' }), { status: 200 }));
});

describe('LiveMarkets', () => {
  it('renders the initial price, then updates on prices.updated', async () => {
    render(<LiveMarkets initialAssets={[btc]} followedSymbols={[]} />);
    expect(screen.getByText('$43,000.00')).toBeInTheDocument();

    await waitFor(() => expect(handlers['prices.updated']).toBeTypeOf('function'));
    act(() => handlers['prices.updated']([{ ...btc, price: 44000, change24h: 5 }]));

    expect(await screen.findByText('$44,000.00')).toBeInTheDocument();
  });
});
