'use client';

import { apiRequest, toastApiError } from '@/lib/api/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { alertSchema, type AlertInput } from '@/lib/schemas/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AddAlertForm({ assets }: { assets: { symbol: string; name: string }[] }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AlertInput>({ resolver: zodResolver(alertSchema) });

  async function onSubmit(values: AlertInput) {
    const res = await apiRequest('/api/alerts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        symbol: values.symbol,
        type: 'crypto',
        targetPrice: Number(values.targetPrice),
        direction: values.direction,
      }),
    });
    if (!res.ok) {
      toastApiError(res.error, { HTTP_500: 'Could not set that alert. Please try again.' });
      return;
    }
    router.push('/alerts');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="symbol">Asset</Label>
        <select id="symbol" {...register('symbol')} className="w-full rounded-md border bg-background p-2 text-sm">
          {assets.map((a) => (
            <option key={a.symbol} value={a.symbol}>
              {a.symbol} — {a.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="direction">Direction</Label>
        <select id="direction" {...register('direction')} className="w-full rounded-md border bg-background p-2 text-sm">
          <option value="above">Goes above</option>
          <option value="below">Goes below</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="targetPrice">Target price (USD)</Label>
        <Input id="targetPrice" inputMode="decimal" placeholder="80000" {...register('targetPrice')} />
        {errors.targetPrice && <p className="text-sm text-destructive">{errors.targetPrice.message}</p>}
      </div>
      <Button type="submit" className="w-full" pending={isSubmitting}>
        {isSubmitting ? 'Setting…' : 'Set alert'}
      </Button>
    </form>
  );
}
