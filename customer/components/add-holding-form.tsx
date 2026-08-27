'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { holdingSchema, type HoldingInput } from '@/lib/schemas/holding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AddHoldingForm({ assets }: { assets: { symbol: string; name: string }[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HoldingInput>({ resolver: zodResolver(holdingSchema) });

  async function onSubmit(values: HoldingInput) {
    setServerError(null);
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        symbol: values.symbol,
        type: 'crypto',
        quantity: Number(values.quantity),
        avgCost: Number(values.avgCost),
      }),
    });
    if (!res.ok) {
      setServerError('Could not add that holding. Please try again.');
      return;
    }
    router.push('/portfolio');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="symbol">Asset</Label>
        <select
          id="symbol"
          {...register('symbol')}
          className="w-full rounded-md border bg-background p-2 text-sm"
        >
          {assets.map((a) => (
            <option key={a.symbol} value={a.symbol}>
              {a.symbol} — {a.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="quantity">Quantity</Label>
        <Input id="quantity" inputMode="decimal" placeholder="0.5" {...register('quantity')} />
        {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="avgCost">Avg buy price (USD)</Label>
        <Input id="avgCost" inputMode="decimal" placeholder="30000" {...register('avgCost')} />
        {errors.avgCost && <p className="text-sm text-destructive">{errors.avgCost.message}</p>}
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Adding…' : 'Add holding'}
      </Button>
    </form>
  );
}
