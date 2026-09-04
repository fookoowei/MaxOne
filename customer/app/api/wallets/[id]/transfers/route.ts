import { serverApiWithRefresh } from '@/lib/api/server';

// BFF: forward an instant transfer to NestJS (ownership-gated on the source there).
// Forwards the step-up grant header (M14c) and passes error bodies through so the form can
// read `STEP_UP_REQUIRED`.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await request
    .json()
    .catch(() => ({}) as { toWalletId?: string; amount?: number; note?: string });
  const stepUp = request.headers.get('x-step-up-token');
  const idem = request.headers.get('idempotency-key');
  const res = await serverApiWithRefresh(`/wallets/${id}/transfers`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(stepUp ? { 'x-step-up-token': stepUp } : {}),
      ...(idem ? { 'idempotency-key': idem } : {}),
    },
    body: JSON.stringify({ toWalletId: b.toWalletId, amount: b.amount, note: b.note }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return Response.json(body, { status: res.status });
  }
  return Response.json(await res.json());
}
