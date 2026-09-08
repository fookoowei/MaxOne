import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Where you are in a short flow. Numbered because it IS a sequence; done steps get a tick.
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((label, i) => {
        const n = i + 1;
        const state = n === current ? 'current' : n < current ? 'done' : 'todo';
        return (
          <li key={label} className="contents">
            <div className={cn('flex items-center gap-1.5 text-xs font-semibold', state === 'current' ? 'text-primary' : 'text-muted-foreground')} aria-current={state === 'current' ? 'step' : undefined}>
              <span className={cn('flex size-6 items-center justify-center rounded-full text-xs', state === 'current' && 'bg-primary text-primary-foreground', state === 'done' && 'bg-status-approved/15 text-status-approved', state === 'todo' && 'bg-secondary text-secondary-foreground')}>
                {state === 'done' ? <Check className="size-3.5" aria-hidden /> : n}
              </span>
              {label}
            </div>
            {i < steps.length - 1 && <div className={cn('h-0.5 flex-1 rounded-full', n < current ? 'bg-primary' : 'bg-border')} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
