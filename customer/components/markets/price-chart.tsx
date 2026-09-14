'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  createChart,
  CandlestickSeries,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';
import { Button } from '@/components/ui/button';
import { toBars, toLine, priceFormat, formatAxisPrice, type Candle } from '@/lib/chart/candles';

const RANGES = ['1m', '5m', '15m', '1h', '4h', '1D'] as const;
type Range = (typeof RANGES)[number];

// A real trading chart: candles (open/high/low/close), a time axis and a price axis, scroll and
// zoom. The old Chart.js line hid both axes and only ever showed the close.
export function PriceChart({ id, initial, live, compact = false }: {
  id: string; initial: { candles: Candle[] }; live?: number; compact?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Area'> | null>(null);
  const [candles, setCandles] = useState(initial.candles);
  const [range, setRange] = useState<Range>('1h');
  const [mode, setMode] = useState<'candle' | 'line'>(compact ? 'line' : 'candle');
  const [busy, setBusy] = useState(false);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';

  // Build (and rebuild on theme/mode change). Data lands in the second effect.
  useEffect(() => {
    if (!box.current) return;
    const text = dark ? '#a1a1aa' : '#71717a';
    const grid = dark ? '#27272a' : '#f4f4f5';
    const c = createChart(box.current, {
      height: compact ? 180 : 280,
      layout: { background: { color: 'transparent' }, textColor: text, attributionLogo: false },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderColor: grid },
      timeScale: { borderColor: grid, timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
      localization: { priceFormatter: formatAxisPrice },
    });
    series.current =
      mode === 'candle'
        ? c.addSeries(CandlestickSeries, {
            upColor: '#16a34a', downColor: '#dc2626',
            borderUpColor: '#16a34a', borderDownColor: '#dc2626',
            wickUpColor: '#16a34a', wickDownColor: '#dc2626',
          })
        : c.addSeries(AreaSeries, {
            lineColor: 'oklch(0.48 0.16 285)', topColor: 'oklch(0.48 0.16 285 / 0.28)',
            bottomColor: 'oklch(0.48 0.16 285 / 0.02)', lineWidth: 2,
          });
    chart.current = c;
    const resize = () => c.applyOptions({ width: box.current?.clientWidth ?? 0 });
    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      c.remove();
      chart.current = null;
      series.current = null;
    };
  }, [mode, dark]);

  // Feed the series. setData (not update) — a range switch replaces the whole history. `dark` is
  // a dependency too: effect 1 tears down and rebuilds the chart+series on a theme change (it
  // runs first, since effects run in declaration order), and without re-feeding here the rebuilt
  // series would stay empty — which happens on most first page loads, since next-themes resolves
  // `resolvedTheme` from undefined right after hydration.
  useEffect(() => {
    if (!series.current) return;
    if (candles.length === 0) {
      // Clear the series rather than leaving the previous timeframe's bars drawn underneath the
      // "Chart unavailable." overlay — an empty `candles` must mean an empty canvas too.
      (series.current as ISeriesApi<'Candlestick'>).setData([]);
      return;
    }
    series.current.applyOptions({ priceFormat: priceFormat(candles[candles.length - 1].c) });
    if (mode === 'candle') (series.current as ISeriesApi<'Candlestick'>).setData(toBars(candles));
    else (series.current as ISeriesApi<'Area'>).setData(toLine(candles));
    chart.current?.timeScale().fitContent();
  }, [candles, mode, dark]);

  // The open candle follows the same number the header shows.
  useEffect(() => {
    if (!live) return;
    setCandles((prev) => {
      if (prev.length === 0) return prev;
      const open = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...open, c: live, h: Math.max(open.h, live), l: Math.min(open.l, live) }];
    });
  }, [live]);

  // A token per request: if a later select() resolves before an earlier one, the earlier one's
  // response is discarded instead of overwriting the still-selected range's data.
  const requestId = useRef(0);

  async function select(next: Range) {
    if (next === range) return;
    const previous = range;
    setRange(next);
    setBusy(true);
    const thisRequest = ++requestId.current;
    try {
      const res = await fetch(`/api/markets/${id}/chart?range=${next}`);
      if (thisRequest !== requestId.current) return; // superseded by a newer selection
      if (!res.ok) {
        // The fetch failed: the chart still shows `previous`, so the controls must say so too —
        // otherwise the active button and the canvas disagree about which timeframe is on screen.
        setRange(previous);
        return;
      }
      setCandles(((await res.json()) as { candles: Candle[] }).candles);
    } catch {
      // Network error: leave the existing candles in place rather than blanking the chart, but
      // still revert the selected range so it isn't left claiming data it never got.
      if (thisRequest === requestId.current) setRange(previous);
    } finally {
      if (thisRequest === requestId.current) setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1" role="group" aria-label="Timeframe">
            {RANGES.map((r) => (
              <Button key={r} type="button" size="sm" variant={range === r ? 'default' : 'outline'}
                aria-pressed={range === r} className="h-8 rounded-full px-3 text-xs"
                onClick={() => select(r)}>
                {r}
              </Button>
            ))}
          </div>
          <Button type="button" size="sm" variant="ghost" className="ml-auto h-8 text-xs"
            onClick={() => setMode(mode === 'candle' ? 'line' : 'candle')}>
            {mode === 'candle' ? 'Line' : 'Candles'}
          </Button>
        </div>
      )}
      <div className="relative">
        {/* Always mounted, even with no data — the chart-creation effect only runs once (on
            mode/theme change) and needs box.current to exist from first mount, or it never
            creates a chart/series for later data to land in. */}
        <div ref={box} className={busy ? 'opacity-50 transition-opacity' : 'transition-opacity'} />
        {candles.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-center text-sm text-muted-foreground">
            Chart unavailable.
          </p>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">Prices via Kraken · informational only</p>
    </div>
  );
}
