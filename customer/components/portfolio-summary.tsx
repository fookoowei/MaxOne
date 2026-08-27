import { formatPrice } from '@/lib/format/price';

export function PortfolioSummary({
  totalValue,
  totalPnl,
}: {
  totalValue: number;
  totalPnl: number;
}) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.38_0.15_290)] p-6 text-primary-foreground shadow-lg shadow-primary/20">
      <p className="text-sm/6 opacity-80">Portfolio value</p>
      <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">{formatPrice(totalValue)}</p>
      <p className="mt-2 text-sm tabular-nums opacity-90">
        {totalPnl >= 0 ? '+' : ''}
        {formatPrice(totalPnl)} total P/L
      </p>
    </section>
  );
}
