import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

// BFF: forward a finance adjustment to NestJS (wallet.adjust-gated there), mirror the status.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await request.json().catch(() => ({}) as { direction?: string; amount?: number; note?: string });
  const res = await serverApiWithRefresh(`/wallets/${id}/adjustments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ direction: b.direction, amount: b.amount, note: b.note }),
  });
  return proxy(res); // M18a: forward the API's status + error envelope
}
