import { cn } from '@/lib/utils';

// A large amount whose digits settle into place as they appear. Each character is keyed by its
// position AND value, so a digit that changes re-mounts (and animates) while the others hold still.
// Screen readers get the whole string once; the animated glyphs are decorative.
export function RollingAmount({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 justify-end overflow-hidden whitespace-nowrap tabular', className)}>
      <span className="sr-only">{value}</span>
      <span aria-hidden className="inline-flex">
        {Array.from(value).map((ch, i) => (
          <span key={`${i}:${ch}`} className="digit-in inline-block">
            {ch}
          </span>
        ))}
      </span>
    </span>
  );
}
