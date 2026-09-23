'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';

// The person's @handle under the balance, one tap to copy — it is the thing they hand to someone
// who wants to pay them, so it lives where the reference shows the card number.
export function CopyHandle({ handle }: { handle?: string }) {
  if (!handle) return null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(`@${handle}`);
      toast.success('Handle copied', { description: `Anyone can pay you with @${handle}.` });
    } catch {
      toast.error('Could not copy your handle.');
    }
  }
  return (
    <button type="button" onClick={copy} aria-label={`Copy your handle @${handle}`} className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-[13px] text-white/75 transition-colors hover:text-white">
      @{handle}
      <Copy className="size-3.5" aria-hidden />
    </button>
  );
}
