import { ChevronDown } from 'lucide-react';
import { currencyFlag } from '@/lib/currencies';

// The currency as a pill: flag, code, chevron. Pressing it opens the picker for that side.
export function CurrencyChip({ side, code, onClick }: { side: 'From' | 'To'; code: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${side} currency: ${code}`}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-card pl-1.5 pr-2.5 text-sm font-semibold shadow-xs transition-[background-color,transform] duration-150 hover:bg-accent active:scale-95"
    >
      <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-[15px] leading-none" aria-hidden>
        {currencyFlag(code)}
      </span>
      {code}
      <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
    </button>
  );
}
