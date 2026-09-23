import type { ComponentType, ReactNode } from 'react';

// An empty screen is an invitation to act: one icon, one plain sentence, at most one action.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed px-6 py-10 text-center">
      {Icon && (
        <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground" aria-hidden>
          <Icon className="size-5" />
        </span>
      )}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
