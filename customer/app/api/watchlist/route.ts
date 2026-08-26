import { serverApiWithRefresh } from '@/lib/api/server';

export async function POST(request: Request) {
  const b = await request.json().catch(() => ({}) as { symbol?: string; type?: string });
  const res = await serverApiWithRefresh('/watchlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ symbol: b.symbol, type: b.type }),
  });
  if (!res.ok) return new Response(null, { status: res.status });
  return Response.json(await res.json());
}
