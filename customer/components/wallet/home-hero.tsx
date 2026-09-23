import Link from 'next/link';
import { Bell, History, LayoutGrid, Plus, Send } from 'lucide-react';
import { LiveBalance } from './live-balance';
import { CopyHandle } from './copy-handle';
import { initials } from '@/lib/format/initials';

interface HeroWallet {
  id: string;
  currency: string;
  balance: number;
}

/**
 * The top of home, as one gradient panel: who you are, what you have, and the two things people
 * do most. Full-bleed on a phone (it cancels the shell's gutters and rounds only its bottom), a
 * rounded card on wider screens. The greeting and name are the page's <h1>.
 */
export function HomeHero({ greeting, name, handle, wallet, pendingCount = 0 }: { greeting: string; name: string; handle?: string; wallet?: HeroWallet; pendingCount?: number }) {
  return (
    <section className="hero-gradient enter-up relative -mx-5 -mt-6 overflow-hidden rounded-b-[32px] px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1.25rem)] text-white shadow-lg shadow-primary/20 md:mx-0 md:mt-0 md:rounded-[32px] md:p-6">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/10 blur-3xl" />
      <header className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-white/15 text-sm font-bold ring-1 ring-white/20" aria-hidden>
            {initials(name)}
          </span>
          <div>
            <p className="text-[13px] text-white/70">{greeting}!</p>
            <h1 className="text-base font-semibold leading-tight">{name}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/activity" aria-label="Activity" className="flex size-10 items-center justify-center rounded-full bg-white/12 transition-colors hover:bg-white/20">
            <History className="size-5" aria-hidden />
          </Link>
          <Link href="/alerts" aria-label="Price alerts" className="flex size-10 items-center justify-center rounded-full bg-white/12 transition-colors hover:bg-white/20">
            <Bell className="size-5" aria-hidden />
          </Link>
        </div>
      </header>

      <div className="relative mt-6">
        {wallet ? (
          <LiveBalance walletId={wallet.id} currency={wallet.currency} initialBalance={wallet.balance} pendingCount={pendingCount} variant="hero" />
        ) : (
          <p className="text-sm text-white/80">No wallet found for your account.</p>
        )}
        <CopyHandle handle={handle} />
      </div>

      <div className="relative mt-5 flex items-center gap-2">
        <Link href="/deposit" className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 text-[13px] font-semibold text-neutral-900 transition-transform duration-150 active:scale-[0.97] sm:h-12 sm:flex-none sm:px-6 sm:text-sm">
          <Plus className="size-4" aria-hidden />
          Deposit
        </Link>
        <Link href="/pay/send" className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white/18 px-3 text-[13px] font-semibold ring-1 ring-white/25 transition-transform duration-150 active:scale-[0.97] sm:h-12 sm:flex-none sm:px-6 sm:text-sm">
          <Send className="size-4" aria-hidden />
          Send money
        </Link>
        <Link href="/pay" aria-label="All payment options" className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/25 transition-transform duration-150 active:scale-[0.97] min-[360px]:flex sm:size-12">
          <LayoutGrid className="size-5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
