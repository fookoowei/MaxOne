'use client';

import { apiRequest, toastApiError } from '@/lib/api/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { holdingSchema, type HoldingInput } from '@/lib/schemas/holding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';

export function AddHoldingForm({ assets }: { assets: { symbol: string; name: string }[] }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HoldingInput>({ resolver: zodResolver(holdingSchema) });

  async function onSubmit(values: HoldingInput) {
    const res = await apiRequest('/api/portfolio', {
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
      toastApiError(res.error, { HTTP_500: 'Could not add that holding. Please try again.' });
      return;
    }
    router.push('/portfolio');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="symbol">Asset</Label>
        <NativeSelect id="symbol" {...register('symbol')}>
          {assets.map((a) => (
            <option key={a.symbol} value={a.symbol}>
              {a.symbol} — {a.name}
            </option>
          ))}
        </NativeSelect>
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
      <Button type="submit" className="w-full" pending={isSubmitting}>
        {isSubmitting ? 'Adding…' : 'Add holding'}
      </Button>
    </form>
  );
}
