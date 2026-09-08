import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export type RecipientState =
  | { kind: 'idle' }
  | { kind: 'looking' }
  | { kind: 'found'; name: string; handle: string; currency: string }
  | { kind: 'error'; message: string };

const initials = (name: string) => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

// What the handle resolved to, in a card the user can read before typing an amount.
export function RecipientCard({ state }: { state: RecipientState }) {
  if (state.kind === 'idle') return null;
  return (
    <div className={cn('flex items-center gap-3 rounded-[20px] border bg-card px-4 py-3', state.kind === 'error' && 'border-status-rejected/40')} role="status">
      {state.kind === 'looking' && (
        <>
          <Spinner size="sm" label="Looking up handle" />
          <p className="text-sm text-muted-foreground">Looking up…</p>
        </>
      )}
      {state.kind === 'found' && (
        <>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-secondary text-[13px] font-bold text-secondary-foreground">{initials(state.name)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{state.name}</p>
            <p className="text-xs text-muted-foreground">@{state.handle} · {state.currency} wallet</p>
          </div>
          <span className="inline-flex h-5 items-center rounded-full bg-status-approved/12 px-2 text-xs font-medium text-status-approved">Found</span>
        </>
      )}
      {state.kind === 'error' && <p className="text-sm text-status-rejected">{state.message}</p>}
    </div>
  );
}
