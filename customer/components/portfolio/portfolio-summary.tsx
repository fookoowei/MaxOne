import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatPrice } from '@/lib/format/price';
import { cn } from '@/lib/utils';

// The portfolio hero. P/L is the number people look for, so it reads as a chip: an arrow (so
// direction survives without colour), the amount, and the percentage. The `-bright` tokens are
// used because the standard mid-tone green/red would disappear into this deep gradient.
export function PortfolioSummary({ totalValue, totalPnl, totalPnlPct }: { totalValue: number; totalPnl: number; totalPnlPct: number }) {
  const up = totalPnl >= 0;
  const Arrow = up ? TrendingUp : TrendingDown;
  return (
    <section className="rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.38_0.15_290)] p-6 text-primary-foreground shadow-lg shadow-primary/20">
      <p className="text-sm/6 opacity-80">Portfolio value</p>
      <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">{formatPrice(totalValue)}</p>
      <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 py-1 pr-3 pl-2.5 text-sm font-medium tabular-nums">
        <Arrow className="size-4" aria-hidden />
        <span className={cn(up ? 'text-status-approved-bright' : 'text-status-rejected-bright')}>
          {up ? '+' : ''}
          {formatPrice(totalPnl)} ({up ? '+' : ''}
          {totalPnlPct.toFixed(2)}%)
        </span>
        <span className="opacity-80">total P/L</span>
      </p>
    </section>
  );
}
