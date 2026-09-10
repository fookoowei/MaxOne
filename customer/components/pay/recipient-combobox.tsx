'use client';

import { Autocomplete } from '@base-ui/react/autocomplete';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { RecipientState } from './recipient-card';

// `{ value, label }` is the shape Base UI fills the input from on item press, no mapper needed.
interface RecipientItem {
  value: string;
  label: string;
  name: string;
  currency: string;
}

const initials = (name: string) => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

/**
 * The @handle field as a search box: what the lookup found drops down UNDER the input — a
 * "looking up" status, the one match as a selectable row, or why there is no match. The lookup
 * itself (debounce, exact-match API, rules) stays in the wizard; this only renders its state.
 * Base UI Autocomplete (not Combobox): it never overwrites what the user typed on close.
 */
export function RecipientCombobox({
  id,
  value,
  onValueChange,
  state,
  open,
  onOpenChange,
}: {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  state: RecipientState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const items: RecipientItem[] = state.kind === 'found' ? [{ value: state.handle, label: state.handle, name: state.name, currency: state.currency }] : [];
  const typed = value.trim().toLowerCase();

  return (
    <Autocomplete.Root items={items} mode="none" value={value} onValueChange={(v) => onValueChange(v)} open={open} onOpenChange={(o) => onOpenChange(o)}>
      <div className="relative">
        <Autocomplete.Input id={id} render={<Input />} placeholder="@handle" autoCapitalize="none" autoCorrect="off" className="h-11 pr-10 text-base" />
        <Search className="pointer-events-none absolute top-1/2 right-3 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
      </div>
      <Autocomplete.Portal>
        <Autocomplete.Positioner sideOffset={6} className="isolate z-50 outline-none">
          <Autocomplete.Popup className="w-(--anchor-width) max-h-(--available-height) overflow-y-auto rounded-2xl border bg-card p-1.5 shadow-lg outline-none">
            {/* Status and Empty stay mounted (aria-live); their CHILDREN change with the lookup. */}
            <Autocomplete.Status className="flex items-center gap-2 px-2.5 py-2 text-sm text-muted-foreground empty:hidden">
              {state.kind === 'looking' && (
                <>
                  <Spinner size="sm" label="Looking up handle" />
                  Looking up @{typed}…
                </>
              )}
            </Autocomplete.Status>
            <Autocomplete.Empty className="px-2.5 py-2 text-sm text-status-rejected empty:hidden">
              {state.kind === 'error' ? state.message : null}
            </Autocomplete.Empty>
            <Autocomplete.List>
              {(item: RecipientItem) => (
                <Autocomplete.Item
                  key={item.value}
                  value={item}
                  className="flex cursor-default items-center gap-3 rounded-xl px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-secondary text-xs font-bold text-secondary-foreground" aria-hidden>
                    {initials(item.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      @{item.value} · {item.currency} wallet
                    </span>
                  </span>
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
