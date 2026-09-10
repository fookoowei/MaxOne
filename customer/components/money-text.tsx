import { cn } from '@/lib/utils';

// Money, typeset like a ledger: tabular figures so columns align, the currency symbol lighter than
// the value, and colour ONLY when the amount carries a direction (credit/debit).
export function MoneyText({
  amountMinor,
  currency,
  tone = 'neutral',
  className,
}: {
  amountMinor: number;
  currency: string;
  tone?: 'neutral' | 'positive' | 'negative';
  className?: string;
}) {
  const parts = new Intl.NumberFormat('en-US', { style: 'currency', currency }).formatToParts(amountMinor / 100);
  const symbol = parts.filter((p) => p.type === 'currency').map((p) => p.value).join('');
  const value = parts.filter((p) => p.type !== 'currency').map((p) => p.value).join('').trim();
  return (
    <span
      className={cn(
        'tabular whitespace-nowrap',
        tone === 'positive' && 'text-status-approved',
        tone === 'negative' && 'text-status-rejected',
        className,
      )}
    >
      {tone === 'positive' && '+'}
      {tone === 'negative' && '−'}
      {/* The symbol stays lighter than the value, but it must not fight the tone: a grey $ beside
          a green number reads as a rendering bug. Neutral keeps the muted grey; a toned amount
          dims the inherited green/red instead. */}
      <span className={tone === 'neutral' ? 'text-muted-foreground' : 'opacity-70'}>{symbol}</span>
      {value}
    </span>
  );
}
