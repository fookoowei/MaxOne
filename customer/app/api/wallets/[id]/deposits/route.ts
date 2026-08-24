import { serverApiWithRefresh } from '@/lib/api/server';

// BFF: forward a deposit REQUEST to NestJS (creates a pending transaction there,
// awaiting staff approval). Mirror the backend status so the client sees failures.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await request.json().catch(() => ({}) as { amount?: number; note?: string });
  const res = await serverApiWithRefresh(`/wallets/${id}/deposits`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ amount: b.amount, note: b.note }),
  });
  if (!res.ok) return new Response(null, { status: res.status });
  return Response.json(await res.json());
}
