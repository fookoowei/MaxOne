import { Delete } from 'lucide-react';
import type { KeypadKey } from '@/lib/exchange/amount-input';

const KEYS: KeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];
const NAME: Partial<Record<KeypadKey, string>> = { '.': 'Decimal point', back: 'Delete' };

// The reference's own keypad instead of the OS keyboard: the amount stays visible above it, every
// key is a 56px target, and a press dips the key like a real button. Desktop users can also just
// type — the screen listens for digit keys.
export function AmountKeypad({ onKey, disabled = false }: { onKey: (key: KeypadKey) => void; disabled?: boolean }) {
  return (
    <div role="group" aria-label="Amount keypad" className="grid grid-cols-3 gap-2">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          disabled={disabled}
          onClick={() => onKey(k)}
          aria-label={NAME[k] ?? k}
          className="flex h-14 select-none items-center justify-center rounded-[18px] bg-secondary text-[22px] font-medium tabular transition-[transform,background-color] duration-150 hover:bg-accent/70 active:scale-[0.94] active:bg-accent disabled:opacity-50"
        >
          {k === 'back' ? <Delete className="size-6" aria-hidden /> : k}
        </button>
      ))}
    </div>
  );
}
