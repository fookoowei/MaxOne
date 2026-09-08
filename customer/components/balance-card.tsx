import { formatMoney } from '@/lib/format/money';

// The dashboard's signature: the customer's primary-wallet balance, large and
// friendly. A soft top-lit iris gradient gives it depth; the amount is set in
// tight tabular figures so digits sit steady as the balance changes.
export function BalanceCard({ balance, currency, pendingCount = 0 }: { balance: number; currency: string; pendingCount?: number }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.38_0.15_290)] p-6 text-primary-foreground shadow-lg shadow-primary/20">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-16 size-40 rounded-full bg-white/10 blur-2xl"
      />
      <p className="text-sm/6 opacity-80">Total balance</p>
      <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
        <span className="tabular">{formatMoney(balance, currency)}</span>
      </p>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs opacity-70">{currency} wallet · live</p>
        {pendingCount > 0 && (
          <span className="inline-flex h-5 items-center rounded-full bg-white/16 px-2 text-xs font-medium">
            {pendingCount} pending
          </span>
        )}
      </div>
    </section>
  );
}
