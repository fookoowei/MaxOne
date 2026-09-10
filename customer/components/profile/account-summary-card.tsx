import { AtSign, Mail } from 'lucide-react';

const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ME';

// Desktop aside on Profile: who is signed in, at a glance.
export function AccountSummaryCard({ name, handle, email }: { name: string; handle?: string; email: string }) {
  return (
    <section className="rounded-[20px] border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-secondary text-sm font-bold text-secondary-foreground" aria-hidden>
          {initials(name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">Personal account</p>
        </div>
      </div>
      <dl className="mt-4 divide-y text-sm">
        {handle && (
          <div className="flex items-center gap-2.5 py-2.5">
            <AtSign className="size-4 text-muted-foreground" aria-hidden />
            <dt className="sr-only">Handle</dt>
            <dd className="font-medium">@{handle}</dd>
          </div>
        )}
        <div className="flex items-center gap-2.5 py-2.5">
          <Mail className="size-4 text-muted-foreground" aria-hidden />
          <dt className="sr-only">Email</dt>
          <dd className="truncate">{email}</dd>
        </div>
      </dl>
    </section>
  );
}
