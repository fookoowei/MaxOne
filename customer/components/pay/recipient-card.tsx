export type RecipientState =
  | { kind: 'idle' }
  | { kind: 'looking' }
  | { kind: 'found'; name: string; handle: string; currency: string }
  | { kind: 'error'; message: string };

import { initials } from '@/lib/format/initials';
import { StatusPill } from '@/components/status-pill';

// The chosen recipient, pinned under the field once the dropdown has closed, so the user can read
// who they're paying while they type the amount. Looking-up and error states live in the dropdown.
export function RecipientCard({ state }: { state: RecipientState }) {
  if (state.kind !== 'found') return null;
  return (
    <div className="flex items-center gap-3 rounded-[20px] border bg-card px-4 py-3" role="status">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-secondary text-[13px] font-bold text-secondary-foreground">{initials(state.name)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{state.name}</p>
        <p className="text-xs text-muted-foreground">
          @{state.handle} · {state.currency} wallet
        </p>
      </div>
      <StatusPill tone="approved">Found</StatusPill>
    </div>
  );
}
