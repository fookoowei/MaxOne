import { serverApiWithRefresh } from '@/lib/api/server';

// BFF: forward an instant transfer to NestJS (ownership-gated on the source there).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await request
    .json()
    .catch(() => ({}) as { toWalletId?: string; amount?: number; note?: string });
  const res = await serverApiWithRefresh(`/wallets/${id}/transfers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ toWalletId: b.toWalletId, amount: b.amount, note: b.note }),
  });
  if (!res.ok) return new Response(null, { status: res.status });
  return Response.json(await res.json());
}
