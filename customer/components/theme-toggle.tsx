'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const;

// A three-way segmented control. Rendered only after mount: the server doesn't know the theme, so
// painting a selection before hydration would flash the wrong one.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? (theme ?? 'system') : 'system';

  return (
    <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-1 rounded-2xl bg-secondary p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const on = current === value;
        return (
          <button key={value} type="button" role="radio" aria-checked={on} onClick={() => setTheme(value)} className={cn('flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition-colors', on ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
