'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { roleHasPermission } from '@/lib/auth/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// amount is MINOR units (cents), matching the backend. The <input> registers with
// valueAsNumber (below), so the field value is already a number here — keeping the schema's
// input and output types identical (a z.coerce would desync them and break useForm's typing).
const schema = z.object({
  direction: z.enum(['credit', 'debit']),
  amount: z.number().int().positive('Amount must be a positive number of cents'),
  note: z.string().min(1, 'A note is required'),
});
type Values = z.infer<typeof schema>;

export function AdjustmentForm({ walletId, role }: { walletId: string; role: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { direction: 'credit', note: '' },
  });

  // UX-only gate; NestJS enforces wallet.adjust regardless.
  if (!roleHasPermission(role, 'wallet.adjust')) {
    return <p className="text-sm text-muted-foreground">You don&apos;t have permission to adjust balances.</p>;
  }

  async function onSubmit(values: Values) {
    setFormError(null);
    const res = await fetch(`/api/wallets/${walletId}/adjustments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      setFormError(
        res.status === 400 ? 'Rejected — a debit can’t make the balance negative.' : 'Something went wrong.',
      );
      return;
    }
    reset({ direction: 'credit', note: '' });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-sm flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="direction">Direction</Label>
        <select id="direction" {...register('direction')} className="rounded border px-2 py-1 text-sm">
          <option value="credit">Credit (+)</option>
          <option value="debit">Debit (−)</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="amount">Amount (cents)</Label>
        <Input id="amount" type="number" inputMode="numeric" {...register('amount', { valueAsNumber: true })} />
        {errors.amount && <span className="text-xs text-red-600">{errors.amount.message}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="note">Note</Label>
        <Input id="note" {...register('note')} />
        {errors.note && <span className="text-xs text-red-600">{errors.note.message}</span>}
      </div>

      {formError && (
        <span role="alert" className="text-xs text-red-600">
          {formError}
        </span>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-fit">
        Apply adjustment
      </Button>
    </form>
  );
}
