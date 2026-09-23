'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUpDown, Info } from 'lucide-react';
import { sanitizeAmount } from '@/lib/format/sanitize-number';
import { parseAmountToMinor } from '@/lib/format/parse-amount';
import { formatMoney } from '@/lib/format/money';
import { useIdempotencyKey } from '@/lib/idempotency/key';
import { apiRequest, toastApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Enter } from '@/components/layout/enter';
import { CurrencyChip } from './currency-chip';
import { CurrencyPicker } from './currency-picker';
import { RollingAmount } from './rolling-amount';
import { ExchangeSuccessDialog } from './exchange-success-dialog';
import type { WalletSummary } from '@/components/wallet/wallet-list';

// One answer from /rates/quote, stamped with the inputs it answered. Whether it is CURRENT is
// derived at render time by comparing those stamps to what the person has typed now — so no
// effect ever has to reset state when the amount changes, and a late reply for an old amount is
// simply never current.
interface QuoteResult {
  converted: number;
  rate: string;
  at: Date;
  minor: number;
  from: string;
  to: string;
}
type QuoteKey = { minor: number; from: string; to: string };
const sameKey = (a: QuoteKey, b: QuoteKey) => a.minor === b.minor && a.from === b.from && a.to === b.to;

const QUOTE_DEBOUNCE_MS = 300;
const plain = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rateFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });

/**
 * Exchange between two of the person's own wallets, laid out like the reference: From over To
 * with a swap button on the seam, the fee/rate card, the action. The To amount is a
 * LIVE quote (debounced) rather than a separate "get quote" step; the money moves only when they
 * press Exchange, through the same idempotent transfer the old form used.
 */
export function ExchangeScreen({ wallets }: { wallets: WalletSummary[] }) {
  const router = useRouter();
  const idem = useIdempotencyKey();
  const [fromId, setFromId] = useState(wallets[0]?.id ?? '');
  const [toId, setToId] = useState(wallets[1]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [failedFor, setFailedFor] = useState<QuoteKey | null>(null);
  const [turns, setTurns] = useState(0);
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ sent: string; received: string } | null>(null);

  const from = wallets.find((w) => w.id === fromId);
  const to = wallets.find((w) => w.id === toId);
  const fromCurrency = from?.currency;
  const toCurrency = to?.currency;
  const minor = parseAmountToMinor(amount);
  const valid = !Number.isNaN(minor);
  const overBalance = valid && !!from && minor > from.balance;

  // Live quote. Debounced so a keypad burst costs one request; a reply that arrives after the
  // amount has moved on is dropped (and would not be current anyway, see QuoteResult).
  useEffect(() => {
    if (!valid || !fromCurrency || !toCurrency) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await apiRequest<{ converted: number; rate: string }>(`/api/rates/quote?from=${fromCurrency}&to=${toCurrency}&amount=${minor}`);
      if (cancelled) return;
      const key = { minor, from: fromCurrency, to: toCurrency };
      if (!res.ok) {
        setFailedFor(key);
        return;
      }
      setFailedFor(null);
      setResult({ converted: res.data.converted, rate: res.data.rate, at: new Date(), ...key });
    }, QUOTE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [valid, minor, fromCurrency, toCurrency]);

  function swap() {
    setFromId(toId);
    setToId(fromId);
    setTurns((t) => t + 1);
  }

  // Picking the wallet already on the other side swaps them, so both sides are always different.
  function pick(side: 'from' | 'to', id: string) {
    if (side === 'from') {
      if (id === toId) setToId(fromId);
      setFromId(id);
    } else {
      if (id === fromId) setFromId(toId);
      setToId(id);
    }
  }

  const key: QuoteKey | null = valid && fromCurrency && toCurrency ? { minor, from: fromCurrency, to: toCurrency } : null;
  const current = key && result && sameKey(result, key) ? result : null;
  const failed = !!key && !!failedFor && sameKey(failedFor, key);
  const loading = !!key && !current && !failed;
  const canSubmit = !!current && !overBalance && !!from && !!to;

  async function submit() {
    if (!canSubmit || !current || !from || !to) return;
    setBusy(true);
    const res = await apiRequest(`/api/wallets/${fromId}/transfers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': idem.key() },
      body: JSON.stringify({ toWalletId: toId, amount: minor }),
    });
    setBusy(false);
    if (!res.ok) {
      toastApiError(res.error, {
        HTTP_409: 'This exchange may have already gone through — check your balances before trying again.',
        HTTP_400: 'Exchange failed. Check your balance and try again.',
        HTTP_500: 'Exchange failed. Check your balance and try again.',
      });
      return;
    }
    idem.reset();
    setDone({ sent: formatMoney(minor, from.currency), received: formatMoney(current.converted, to.currency) });
  }

  if (!from || !to) return null;

  // While a fresh quote is in flight, the last answer stays on screen dimmed rather than blinking
  // to zero; with nothing typed, the To side shows a quiet 0.00.
  const shown = current ?? (key ? result : null);
  const toDisplay = shown ? plain.format(shown.converted / 100) : '0.00';
  const updated = current ? current.at.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="space-y-4">
      <header className="relative flex h-11 items-center justify-center">
        <Link href="/" aria-label="Back to home" className="absolute left-0 flex size-11 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-accent">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-base font-semibold">Exchange</h1>
      </header>

      <div className="relative space-y-2">
        <Enter i={0}>
          <section aria-label="From" className="rounded-[22px] bg-secondary/60 p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>From</span>
              <span>
                Available: <span className="font-medium text-foreground tabular">{formatMoney(from.balance, from.currency)}</span>
              </span>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <CurrencyChip side="From" code={from.currency} onClick={() => setPicker('from')} />
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                autoFocus
                aria-label={`Amount in ${from.currency}`}
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
                className={cn(
                  'min-w-0 flex-1 bg-transparent text-right text-[28px] font-bold leading-none tracking-tight tabular outline-none placeholder:text-muted-foreground/50 min-[360px]:text-[32px]',
                  overBalance && 'text-status-rejected',
                )}
              />
            </div>
          </section>
        </Enter>

        <button
          type="button"
          onClick={swap}
          aria-label="Swap currencies"
          className="absolute left-1/2 top-1/2 z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[14px] bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform duration-150 active:scale-90"
        >
          <ArrowUpDown className="size-5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `rotate(${turns * 180}deg)` }} aria-hidden />
        </button>

        <Enter i={1}>
          <section aria-label="To" className="rounded-[22px] bg-secondary/60 p-4">
            <p className="text-sm text-muted-foreground">To</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <CurrencyChip side="To" code={to.currency} onClick={() => setPicker('to')} />
              <RollingAmount
                value={toDisplay}
                className={cn('text-[28px] font-bold leading-none tracking-tight transition-opacity duration-200 min-[360px]:text-[32px]', !shown && 'text-muted-foreground/50', loading && shown && 'opacity-60')}
              />
            </div>
          </section>
        </Enter>
      </div>

      <Enter i={2}>
        <section className="rounded-[22px] bg-secondary/60 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              Exchange fee
              <Info className="size-3.5" aria-hidden />
            </span>
            <span className="rounded-full bg-card px-2.5 py-1 text-xs font-medium">Free</span>
          </div>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">Rate</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{updated ? `Updated ${updated} · indicative until confirmed` : 'Type an amount to see the live rate'}</p>
            </div>
            <p className="text-right tabular">{shown ? `1 ${from.currency} ≈ ${rateFmt.format(Number(shown.rate))} ${to.currency}` : '—'}</p>
          </div>
          {overBalance && <p className="mt-3 text-xs font-medium text-status-rejected">That is more than the {from.currency} you have.</p>}
          {failed && <p className="mt-3 text-xs font-medium text-status-rejected">Could not fetch a rate right now. Keep typing to retry.</p>}
        </section>
      </Enter>

      <Enter i={3}>
        <Button size="xl" className="h-13 w-full rounded-[18px] text-base transition-[background-color,opacity] duration-300" disabled={!canSubmit} pending={busy} onClick={submit}>
          Exchange money
        </Button>
      </Enter>

      <CurrencyPicker open={picker === 'from'} onOpenChange={(o) => setPicker(o ? 'from' : null)} title="Exchange from" wallets={wallets} selectedId={fromId} onPick={(id) => pick('from', id)} />
      <CurrencyPicker open={picker === 'to'} onOpenChange={(o) => setPicker(o ? 'to' : null)} title="Exchange to" wallets={wallets} selectedId={toId} onPick={(id) => pick('to', id)} />
      <ExchangeSuccessDialog open={done !== null} summary={done ? `${done.sent} became about ${done.received}.` : ''} onHome={() => router.push('/')} />
    </div>
  );
}
