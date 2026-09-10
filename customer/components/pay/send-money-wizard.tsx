'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useController, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bell, Check } from 'lucide-react';
import { transferSchema, type TransferInput } from '@/lib/schemas/transfer';
import { parseAmountToMinor } from '@/lib/format/parse-amount';
import { formatMoney } from '@/lib/format/money';
import { apiRequest, toastApiError } from '@/lib/api/client';
import { useIdempotencyKey } from '@/lib/idempotency/key';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stepper } from '@/components/layout/stepper';
import { MoneyText } from '@/components/money-text';
import { AmountDisplay } from '@/components/wallet/amount-display';
import { RecipientCard, type RecipientState } from './recipient-card';
import { RecipientCombobox } from './recipient-combobox';
import { StepUpPrompt } from './step-up-prompt';

interface Recipient { walletId: string; currency: string; recipientName: string }
const STEPS = ['Details', 'Confirm', 'Done'];
const symbolOf = (currency: string) => (new Intl.NumberFormat('en-US', { style: 'currency', currency }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency);

/**
 * Send money in three steps. The handle resolves as you type (debounced); the amount is entered
 * where you can see it; the confirm step says exactly what happens and, if the API asks for a
 * step-up, shows the code/passkey prompt right there and retries with the grant. One idempotency
 * key per logical send: reused across retries, reset after success (the server can never
 * double-charge).
 */
export function SendMoneyWizard({ myWalletId, myCurrency, balance, prefillHandle = '' }: { myWalletId: string; myCurrency: string; balance: number; prefillHandle?: string }) {
  const router = useRouter();
  const idem = useIdempotencyKey();
  const [step, setStep] = useState(1);
  // What the last lookup resolved, tagged with the handle it was for: the recipient and the
  // dropdown state are DERIVED from this + what is currently typed, so typing something new
  // drops a stale match immediately without any setState-in-effect.
  const [resolved, setResolved] = useState<{ handle: string; recipient: Recipient | null; state: RecipientState }>({ handle: '', recipient: null, state: { kind: 'idle' } });
  const [values, setValues] = useState<TransferInput | null>(null);
  const [stepUp, setStepUp] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ id: string } | null>(null);
  const form = useForm<TransferInput>({ resolver: zodResolver(transferSchema), defaultValues: { handle: prefillHandle.toLowerCase(), amount: '', note: '' } });
  // The handle field is a Base UI Autocomplete, which owns the <input>, so it's a controlled
  // field rather than a register()ed one. `open` is ours: Base UI asks to open on typing and to
  // close on pick / Escape / outside press; we only let it open once there's something to show.
  const { field: handleField } = useController({ name: 'handle', control: form.control });
  const handle = handleField.value;
  const [open, setOpen] = useState(false);
  const symbol = symbolOf(myCurrency);
  const minor = values ? parseAmountToMinor(values.amount) : 0;

  const typed = (handle ?? '').trim().toLowerCase();
  const typedIsHandle = /^[a-z][a-z0-9_]{2,19}$/.test(typed);
  const current = resolved.handle === typed ? resolved : null;
  const recipient = current?.recipient ?? null;
  const lookup: RecipientState = current ? current.state : typedIsHandle ? { kind: 'looking' } : { kind: 'idle' };

  // Resolve the handle 400ms after the user stops typing. The rules (not yourself, same currency)
  // are the same ones the old Find button enforced.
  useEffect(() => {
    if (!typedIsHandle) return;
    const h = typed;
    const fail = (message: string) => setResolved({ handle: h, recipient: null, state: { kind: 'error', message } });
    const t = setTimeout(async () => {
      const r = await apiRequest<Recipient>(`/api/wallets/lookup?handle=${encodeURIComponent(h)}`);
      if (!r.ok) return fail('No one found with that handle.');
      if (r.data.walletId === myWalletId) return fail("You can't send to yourself.");
      if (r.data.currency !== myCurrency) return fail('Cross-currency sending is coming soon.');
      setResolved({ handle: h, recipient: r.data, state: { kind: 'found', name: r.data.recipientName, handle: h, currency: r.data.currency } });
    }, 400);
    return () => clearTimeout(t);
  }, [typed, typedIsHandle, myWalletId, myCurrency]);

  function toConfirm(v: TransferInput) {
    if (!recipient) return;
    setValues(v);
    setStep(2);
  }

  async function send(stepUpToken?: string) {
    if (!recipient || !values) return;
    setPending(true);
    const r = await apiRequest<{ id: string }>(`/api/wallets/${myWalletId}/transfers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': idem.key(), ...(stepUpToken ? { 'x-step-up-token': stepUpToken } : {}) },
      body: JSON.stringify({ toWalletId: recipient.walletId, amount: minor, note: values.note || undefined }),
    });
    setPending(false);
    if (!r.ok) {
      if (r.error.status === 403 && r.error.code === 'STEP_UP_REQUIRED') {
        setStepUp(true); // the prompt appears on this step; its grant calls send() again
        return;
      }
      toastApiError(r.error, {
        HTTP_409: 'This send may have already gone through — check your balance before trying again.',
        HTTP_500: 'Could not send. Check your balance and try again.',
        HTTP_400: 'Could not send. Check your balance and try again.',
      });
      return;
    }
    idem.reset();
    setStepUp(false);
    setResult(r.data);
    setStep(3);
  }

  return (
    <div className="space-y-6">
      <Stepper steps={STEPS} current={step} />

      {step === 1 && (
        <form onSubmit={form.handleSubmit(toConfirm)} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="handle" className="text-xs text-muted-foreground">Send to</Label>
            <RecipientCombobox id="handle" value={handle ?? ''} onValueChange={handleField.onChange} state={lookup} open={open && lookup.kind !== 'idle'} onOpenChange={setOpen} />
            {form.formState.errors.handle && <p className="text-sm text-destructive">{form.formState.errors.handle.message}</p>}
          </div>
          {/* Pinned only once the dropdown is closed, so the match isn't shown twice. */}
          {!open && <RecipientCard state={lookup} />}
          <section className="space-y-4 rounded-[20px] border bg-card p-5">
            <Label htmlFor="amount" className="text-xs text-muted-foreground">Amount</Label>
            <AmountDisplay id="amount" symbol={symbol} invalid={!!form.formState.errors.amount} {...form.register('amount')} />
            {form.formState.errors.amount && <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Available</span>
              <MoneyText amountMinor={balance} currency={myCurrency} className="font-medium" />
            </div>
          </section>
          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-xs text-muted-foreground">Note{lookup.kind === 'found' ? ` for ${lookup.name.split(' ')[0]}` : ''} (optional)</Label>
            <Input id="note" className="h-11 text-base" {...form.register('note')} />
          </div>
          <Button type="submit" size="xl" className="w-full" disabled={!recipient}>
            Continue
          </Button>
        </form>
      )}

      {step === 2 && values && recipient && (
        <div className="space-y-5">
          <section className="rounded-[20px] border bg-card px-4 py-1">
            {[
              ['To', `${recipient.recipientName} · @${values.handle.toLowerCase()}`],
              ['Amount', <MoneyText key="a" amountMinor={minor} currency={myCurrency} className="font-bold" />],
              ['Fee', 'None'],
              ['Arrives', 'Instantly'],
              ...(values.note ? [['Note', values.note]] : []),
            ].map(([k, v]) => (
              <div key={String(k)} className="flex items-center justify-between py-3 text-sm [&:not(:last-child)]:border-b">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </section>
          {stepUp ? (
            <StepUpPrompt pending={pending} onGrant={(t) => send(t)} />
          ) : (
            <>
              <div className="flex gap-3 rounded-[20px] border bg-card px-4 py-3.5 text-sm">
                <Bell className="mt-0.5 size-[18px] shrink-0 text-status-pending" aria-hidden />
                <p>This sends money right away and cannot be undone. Confirming may ask for your passkey or code.</p>
              </div>
              <div className="flex flex-col gap-2.5">
                <Button type="button" variant="outline" size="xl" onClick={() => setStep(1)} disabled={pending}>
                  Edit
                </Button>
                <Button type="button" size="xl" pending={pending} onClick={() => void send()}>
                  Confirm and send {formatMoney(minor, myCurrency)}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 3 && result && recipient && (
        <div className="space-y-5">
          <section className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex size-[72px] items-center justify-center rounded-3xl bg-status-approved/12 text-status-approved">
              <Check className="size-8" aria-hidden />
            </span>
            <h2 className="text-xl font-semibold">Sent</h2>
            <p className="max-w-[280px] text-sm text-muted-foreground">
              {formatMoney(minor, myCurrency)} is on its way to {recipient.recipientName}. It arrives instantly.
            </p>
          </section>
          <section className="rounded-[20px] border bg-card px-4 py-1 text-sm">
            <div className="flex items-center justify-between border-b py-3">
              <span className="text-muted-foreground">To</span>
              <span className="font-medium">{recipient.recipientName}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-medium tabular">#{result.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </section>
          <div className="flex flex-col gap-2.5">
            <Button type="button" variant="outline" size="xl" onClick={() => { form.reset({ handle: '', amount: '', note: '' }); setResolved({ handle: '', recipient: null, state: { kind: 'idle' } }); setOpen(false); setValues(null); setResult(null); setStep(1); }}>
              Send again
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
