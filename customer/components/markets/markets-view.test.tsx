import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarketsView } from './markets-view';
import type { MarketAsset } from '@/components/market-list';

const handlers: Record<string, (p: unknown) => void> = {};
const socket = { on: (ev: string, cb: (p: unknown) => void) => { handlers[ev] = cb; }, disconnect: vi.fn() };
vi.mock('@/lib/realtime/socket', () => ({ connectSocket: () => socket }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const btc: MarketAsset = { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 43000, change24h: 2 };
const eth: MarketAsset = { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', type: 'crypto', price: 3400, change24h: -0.8 };

beforeEach(() => {
  for (const k of Object.keys(handlers)) delete handlers[k];
  vi.restoreAllMocks();
  vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ticket: 't' }), { status: 200 }));
});

describe('MarketsView', () => {
  it('renders the initial price, then updates on prices.updated', async () => {
    render(<MarketsView initialAssets={[btc]} followedSymbols={[]} />);
    expect(screen.getByText('$43,000.00')).toBeInTheDocument();
    await waitFor(() => expect(handlers['prices.updated']).toBeTypeOf('function'));
    act(() => handlers['prices.updated']([{ ...btc, price: 44000, change24h: 5 }]));
    expect(await screen.findByText('$44,000.00')).toBeInTheDocument();
  });
  it('search narrows by name or symbol; chips filter watching / gainers / losers', async () => {
    render(<MarketsView initialAssets={[btc, eth]} followedSymbols={['ETH']} />);
    await userEvent.type(screen.getByLabelText('Search coins'), 'eth');
    expect(screen.queryByText('Bitcoin')).toBeNull();
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Search coins'));
    await userEvent.click(screen.getByRole('button', { name: 'Losers' }));
    expect(screen.queryByText('Bitcoin')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Watching' }));
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    expect(screen.queryByText('Bitcoin')).toBeNull();
  });
  it('an empty watchlist invites starring', async () => {
    render(<MarketsView initialAssets={[btc]} followedSymbols={[]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Watching' }));
    expect(screen.getByText(/star assets/i)).toBeInTheDocument();
  });
});
