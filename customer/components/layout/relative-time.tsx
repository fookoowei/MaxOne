import { relativeTime } from '@/lib/format/relative-time';

// The coarse age visibly, the exact moment on hover / for screen readers.
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const d = new Date(iso);
  return (
    <time dateTime={iso} title={d.toLocaleString()} className={className}>
      {relativeTime(iso)}
    </time>
  );
}
