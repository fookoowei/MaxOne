import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PriceChart } from './price-chart';
import type { Candle } from '@/lib/chart/candles';

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));

// A minimal fake of the lightweight-charts surface this component touches: createChart() ->
// a chart with addSeries()/timeScale()/remove(), addSeries() -> a series with setData()/
// applyOptions(). No real canvas/rendering — this is jsdom, and we only need to observe calls.
const seriesInstances: { setData: ReturnType<typeof vi.fn>; applyOptions: ReturnType<typeof vi.fn> }[] = [];
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => {
      const series = { setData: vi.fn(), applyOptions: vi.fn() };
      seriesInstances.push(series);
      return series;
    }),
    applyOptions: vi.fn(),
    timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
    remove: vi.fn(),
  })),
  CandlestickSeries: 'candlestick',
  AreaSeries: 'area',
}));

const candle = (t: number, c: number): Candle => ({ t, o: c, h: c, l: c, c });
const initialCandles = [candle(0, 100), candle(3600, 110)];

beforeEach(() => {
  seriesInstances.length = 0;
  vi.restoreAllMocks();
});

describe('PriceChart range switch', () => {
  it('reverts the active range on a non-OK response, so the controls never disagree with the canvas', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 502 }));
    render(<PriceChart id="bitcoin" initial={{ candles: initialCandles }} />);

    const dayButton = screen.getByRole('button', { name: '1D' });
    await userEvent.click(dayButton);

    // The fetch failed: '1D' must not stay the active button while the chart still shows 1h data.
    await waitFor(() => expect(dayButton).toHaveAttribute('aria-pressed', 'false'));
    expect(screen.getByRole('button', { name: '1h' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('reverts the active range when the fetch throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));
    render(<PriceChart id="bitcoin" initial={{ candles: initialCandles }} />);

    const dayButton = screen.getByRole('button', { name: '1D' });
    await userEvent.click(dayButton);

    await waitFor(() => expect(dayButton).toHaveAttribute('aria-pressed', 'false'));
    expect(screen.getByRole('button', { name: '1h' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clears the series when the new range comes back empty, instead of leaving stale bars under the overlay', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ candles: [] }), { status: 200 }),
    );
    render(<PriceChart id="bitcoin" initial={{ candles: initialCandles }} />);

    await userEvent.click(screen.getByRole('button', { name: '1D' }));

    await waitFor(() => expect(screen.getByText('Chart unavailable.')).toBeInTheDocument());
    const series = seriesInstances[0];
    expect(series.setData).toHaveBeenLastCalledWith([]);
  });

  it('does not revert the range on success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ candles: [candle(0, 50), candle(60, 55)] }), { status: 200 }),
    );
    render(<PriceChart id="bitcoin" initial={{ candles: initialCandles }} />);

    const dayButton = screen.getByRole('button', { name: '1D' });
    await userEvent.click(dayButton);

    await waitFor(() => expect(dayButton).toHaveAttribute('aria-pressed', 'true'));
  });
});
