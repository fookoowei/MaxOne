'use client';

import { Check } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { currencyFlag, currencyName } from '@/lib/currencies';
import { formatMoney } from '@/lib/format/money';
import { cn } from '@/lib/utils';
import type { WalletSummary } from '@/components/wallet/wallet-list';

// A bottom sheet of the person's wallets. Picking one closes the sheet; the screen decides what
// happens if it collides with the other side (it swaps, so From and To can never be the same).
export function CurrencyPicker({
  open,
  onOpenChange,
  title,
  wallets,
  selectedId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  wallets: WalletSummary[];
  selectedId: string;
  onPick: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="mx-auto max-w-[440px] rounded-t-[28px] pb-[max(env(safe-area-inset-bottom),1rem)] sm:bottom-6 sm:rounded-b-[28px] sm:border">
        <SheetHeader className="pb-1">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <ul className="px-2">
          {wallets.map((w) => {
            const selected = w.id === selectedId;
            return (
              <li key={w.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onPick(w.id);
                    onOpenChange(false);
                  }}
                  className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-accent/50', selected && 'bg-accent/40')}
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-xl leading-none" aria-hidden>
                    {currencyFlag(w.currency)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{w.currency}</span>
                    <span className="block text-xs text-muted-foreground">{currencyName(w.currency)}</span>
                  </span>
                  <span className="text-sm font-medium tabular">{formatMoney(w.balance, w.currency)}</span>
                  {selected && <Check className="size-4 text-primary" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
