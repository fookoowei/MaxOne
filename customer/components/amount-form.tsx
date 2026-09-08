'use client';

import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { amountSchema, type AmountInput } from '@/lib/schemas/amount';
import { parseAmountToMinor } from '@/lib/format/parse-amount';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIdempotencyKey } from '@/lib/idempotency/key';

export function AmountForm({
  mode,
  walletId,
  currency,
}: {
  mode: 'deposit' | 'withdraw';
  walletId: string;
  currency: string;
}) {
  const router = useRouter();
  const idem = useIdempotencyKey();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AmountInput>({ resolver: zodResolver(amountSchema) });

  const endpoint = mode === 'deposit' ? 'deposits' : 'withdrawals';
  const cta = mode === 'deposit' ? 'Request deposit' : 'Request withdrawal';

  async function onSubmit(values: AmountInput) {
    const amount = parseAmountToMinor(values.amount);
    const res = await fetch(`/api/wallets/${walletId}/${endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': idem.key() },
      body: JSON.stringify({ amount, note: values.note || undefined }),
    });
    if (res.status === 409) {
      toast.error('This request may already have been submitted — check your history before trying again.');
      return;
    }
    if (!res.ok) {
      toast.error(
        mode === 'withdraw' && res.status === 400
          ? 'Insufficient funds for this withdrawal.'
          : 'Could not submit your request. Please try again.',
      );
      return;
    }
    idem.reset();
    router.push('/');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="amount">Amount ({currency})</Label>
        <Input id="amount" inputMode="decimal" placeholder="0.00" {...register('amount')} />
        {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="note">Note (optional)</Label>
        <Input id="note" {...register('note')} />
      </div>
      <Button type="submit" className="w-full" pending={isSubmitting}>
        {isSubmitting ? 'Submitting…' : cta}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        This creates a request that a MaxOne admin reviews. Your balance updates once it's approved.
      </p>
    </form>
  );
}
