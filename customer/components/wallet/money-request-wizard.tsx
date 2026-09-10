'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { amountSchema, type AmountInput } from '@/lib/schemas/amount';
import { parseAmountToMinor } from '@/lib/format/parse-amount';
import { formatMoney } from '@/lib/format/money';
import { apiRequest, toastApiError } from '@/lib/api/client';
import { useIdempotencyKey } from '@/lib/idempotency/key';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stepper } from '@/components/layout/stepper';
import { MoneyText } from '@/components/money-text';
import { AmountDisplay } from './amount-display';

const QUICK = [5000, 10000, 25000, 50000];
const STEPS = ['Amount', 'Review', 'Done'];
const symbolOf = (currency: string) => (new Intl.NumberFormat('en-US', { style: 'currency', currency }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency);

/**
 * Add money / withdraw in three steps: enter the amount where you can see it, review exactly what
 * you are asking for, then a receipt. The request is one logical money operation, so ONE
 * idempotency key covers every retry of it and resets only after success.
 * Deposits land instantly (2026-09-10); withdrawals still wait for a MaxOne reviewer — the copy
 * on every step says which.
 */
export function MoneyRequestWizard({ mode, walletId, currency, balance }: { mode: 'deposit' | 'withdraw'; walletId: string; currency: string; balance: number }) {
  const router = useRouter();
  const idem = useIdempotencyKey();
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<AmountInput | null>(null);
  const [result, setResult] = useState<{ id: string } | null>(null);
  const [pending, setPending] = useState(false);
  const form = useForm<AmountInput>({ resolver: zodResolver(amountSchema), defaultValues: { amount: '', note: '' } });
  const symbol = symbolOf(currency);
  const noun = mode === 'deposit' ? 'deposit' : 'withdrawal';
  const minor = values ? parseAmountToMinor(values.amount) : 0;
  const overBalance = mode === 'withdraw' && minor > balance;

  function toReview(v: AmountInput) {
    setValues(v);
    setStep(2);
  }

  async function submit() {
    if (!values) return;
    setPending(true);
    const endpoint = mode === 'deposit' ? 'deposits' : 'withdrawals';
    const r = await apiRequest<{ id: string }>(`/api/wallets/${walletId}/${endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': idem.key() },
      body: JSON.stringify({ amount: minor, note: values.note || undefined }),
    });
    setPending(false);
    if (!r.ok) {
      toastApiError(r.error, {
        HTTP_409: 'This request may already have been submitted — check your activity before trying again.',
        HTTP_400: mode === 'withdraw' ? 'Insufficient funds for this withdrawal.' : undefined,
      });
      return;
    }
    idem.reset();
    setResult(r.data);
    setStep(3);
  }

  return (
    <div className="space-y-6">
      <Stepper steps={STEPS} current={step} />

      {step === 1 && (
        <form onSubmit={form.handleSubmit(toReview)} className="space-y-5" noValidate>
          <section className="space-y-4 rounded-[20px] border bg-card p-5">
            <Label htmlFor="amount" className="text-xs text-muted-foreground">
              {mode === 'deposit' ? 'Amount to add' : 'Amount to withdraw'}
            </Label>
            <AmountDisplay id="amount" symbol={symbol} invalid={!!form.formState.errors.amount} {...form.register('amount')} />
            {form.formState.errors.amount && <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Quick amounts">
              {QUICK.map((q) => (
                <Button key={q} type="button" variant="outline" size="sm" className="h-9" onClick={() => form.setValue('amount', (q / 100).toFixed(2), { shouldValidate: true })}>
                  {formatMoney(q, currency)}
                </Button>
              ))}
            </div>
            <div className="flex justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">{mode === 'deposit' ? 'To' : 'From'}</span>
              <span className="font-medium">My Wallet · {currency}</span>
            </div>
            {mode === 'withdraw' && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Available</span>
                <MoneyText amountMinor={balance} currency={currency} className="font-medium" />
              </div>
            )}
          </section>
          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-xs text-muted-foreground">Note (optional)</Label>
            <Input id="note" className="h-11 text-base" {...form.register('note')} />
          </div>
          <p className="text-xs text-muted-foreground">
            {mode === 'deposit' ? 'Added to your balance the moment you confirm.' : 'A MaxOne reviewer approves withdrawals. Your balance updates once it is approved.'}
          </p>
          <Button type="submit" size="xl" className="w-full">
            Continue
          </Button>
        </form>
      )}

      {step === 2 && values && (
        <div className="space-y-5">
          <section className="rounded-[20px] border bg-card px-4 py-1">
            {[
              ['Amount', <MoneyText key="a" amountMinor={minor} currency={currency} className="font-bold" />],
              [mode === 'deposit' ? 'To' : 'From', 'My Wallet · ' + currency],
              ['Fee', 'None'],
              ...(values.note ? [['Note', values.note]] : []),
              mode === 'deposit' ? ['Arrives', 'Instantly'] : ['Approval', 'Reviewed by MaxOne'],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex items-center justify-between py-3 text-sm [&:not(:last-child)]:border-b">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </section>
          {overBalance ? (
            <p className="rounded-[20px] bg-status-rejected/10 px-4 py-3 text-sm text-status-rejected">That is more than your available balance of {formatMoney(balance, currency)}.</p>
          ) : (
            <div className="flex gap-3 rounded-[20px] bg-accent px-4 py-3.5 text-sm text-accent-foreground">
              <Check className="mt-0.5 size-[18px] shrink-0" aria-hidden />
              <p>{mode === 'deposit' ? 'This adds the money to your wallet right away.' : 'Nothing moves until a reviewer approves it. You will get a notification either way.'}</p>
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            <Button type="button" variant="outline" size="xl" onClick={() => setStep(1)} disabled={pending}>
              Edit amount
            </Button>
            <Button type="button" size="xl" pending={pending} disabled={overBalance} onClick={() => void submit()}>
              {mode === 'deposit' ? `Add ${formatMoney(minor, currency)}` : `Request ${formatMoney(minor, currency)} ${noun}`}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="space-y-5">
          <section className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex size-[72px] items-center justify-center rounded-3xl bg-status-approved/12 text-status-approved">
              <Check className="size-8" aria-hidden />
            </span>
            <h2 className="text-xl font-semibold">{mode === 'deposit' ? 'Money added' : 'Request sent'}</h2>
            <p className="max-w-[280px] text-sm text-muted-foreground">
              {mode === 'deposit' ? `${formatMoney(minor, currency)} is in your wallet.` : `${formatMoney(minor, currency)} is waiting for review. We will notify you when it is approved.`}
            </p>
          </section>
          <section className="rounded-[20px] border bg-card px-4 py-1 text-sm">
            <div className="flex items-center justify-between border-b py-3">
              <span className="text-muted-foreground">Status</span>
              {mode === 'deposit' ? (
                <span className="inline-flex h-5 items-center rounded-full bg-status-approved/12 px-2 text-xs font-medium text-status-approved">Completed</span>
              ) : (
                <span className="inline-flex h-5 items-center rounded-full bg-status-pending/12 px-2 text-xs font-medium text-status-pending">Pending review</span>
              )}
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-medium tabular">#{result.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </section>
          <div className="flex flex-col gap-2.5">
            <Button type="button" variant="outline" size="xl" onClick={() => { form.reset(); setValues(null); setResult(null); setStep(1); }}>
              {mode === 'deposit' ? 'Add more money' : 'Request another withdrawal'}
            </Button>
            <Button type="button" size="xl" onClick={() => router.push('/')}>
              Back to home
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
