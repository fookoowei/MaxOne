import { serverApiWithRefresh } from '@/lib/api/server';
import { proxy } from '@/lib/api/proxy';

// BFF: forward a withdrawal REQUEST to NestJS (creates a pending transaction there,
// awaiting staff approval; the backend 400s if the balance is insufficient). Mirror
// the backend status so the client can surface those failures.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idem = request.headers.get('idempotency-key');
  const b = await request.json().catch(() => ({}) as { amount?: number; note?: string });
  const res = await serverApiWithRefresh(`/wallets/${id}/withdrawals`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(idem ? { 'idempotency-key': idem } : {}),
    },
    body: JSON.stringify({ amount: b.amount, note: b.note }),
  });
  return proxy(res); // M18a: forward the API's status + error envelope
}
